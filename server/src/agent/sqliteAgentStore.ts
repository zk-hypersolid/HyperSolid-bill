import Database from "better-sqlite3";
import type { AgentRecord, AgentStore } from "./agentManager";
import { open, seal } from "./secretBox";

interface Row {
  owner: string;
  agent_address: string;
  enc_private_key: string;
  approved: number;
  valid_until: number | null;
}

/**
 * Durable `AgentStore` over SQLite with the private key **encrypted at rest** (AES-256-GCM via
 * secretBox). Agents survive restarts so the scheduler keeps trading after a reboot without forcing
 * re-approval; the raw key only ever exists decrypted in memory. Owner matching is case-insensitive.
 */
export class SqliteAgentStore implements AgentStore {
  private constructor(
    private db: Database.Database,
    private encKey: Buffer,
  ) {}

  static open(path: string, encKey: Buffer): SqliteAgentStore {
    const db = new Database(path);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        owner TEXT PRIMARY KEY,
        agent_address TEXT NOT NULL,
        enc_private_key TEXT NOT NULL,
        approved INTEGER NOT NULL,
        valid_until INTEGER
      );
    `);
    return new SqliteAgentStore(db, encKey);
  }

  get(owner: string): AgentRecord | undefined {
    const row = this.db.prepare("SELECT * FROM agents WHERE owner = ?").get(owner.toLowerCase()) as Row | undefined;
    if (!row) return undefined;
    return {
      owner: row.owner,
      agentAddress: row.agent_address,
      privateKey: open(row.enc_private_key, this.encKey) as `0x${string}`,
      approved: row.approved === 1,
      validUntil: row.valid_until ?? undefined,
    };
  }

  set(rec: AgentRecord): void {
    this.db
      .prepare(
        `INSERT INTO agents (owner, agent_address, enc_private_key, approved, valid_until)
         VALUES (@owner, @agentAddress, @enc, @approved, @validUntil)
         ON CONFLICT(owner) DO UPDATE SET
           agent_address = excluded.agent_address,
           enc_private_key = excluded.enc_private_key,
           approved = excluded.approved,
           valid_until = excluded.valid_until`,
      )
      .run({
        owner: rec.owner.toLowerCase(),
        agentAddress: rec.agentAddress,
        enc: seal(rec.privateKey, this.encKey),
        approved: rec.approved ? 1 : 0,
        validUntil: rec.validUntil ?? null,
      });
  }

  remove(owner: string): void {
    this.db.prepare("DELETE FROM agents WHERE owner = ?").run(owner.toLowerCase());
  }

  close(): void {
    this.db.close();
  }
}
