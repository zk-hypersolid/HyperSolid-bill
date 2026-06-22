/**
 * Minimal synchronous SQL port. Production adapter wraps expo-sqlite's `openDatabaseSync`
 * (runSync/getAllSync/execSync); tests inject an in-memory fake — expo-sqlite never runs in jest.
 */
export type SqlParam = string | number | null;
export interface SqlRow {
  [column: string]: SqlParam;
}

export interface SqlDb {
  /** Batch DDL / multi-statement (migrations). No bound params. */
  exec(sql: string): void;
  /** INSERT / UPDATE / DELETE with bound params. */
  run(sql: string, params?: SqlParam[]): void;
  /** SELECT with bound params. */
  all<T extends SqlRow = SqlRow>(sql: string, params?: SqlParam[]): T[];
}
