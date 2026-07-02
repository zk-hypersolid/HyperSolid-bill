# TWAP + TP/SL Strategy Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Commit convention:** commit locally with `git commit --no-verify` and the trailer `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`. Do NOT push (the user pushes explicitly).

**Goal:** Add TWAP and TP/SL strategy templates to the existing agent-automation engine, alongside the working DCA template.

**Architecture:** Generalize the DCA-only server engine into a discriminated-union strategy model (`kind: "dca" | "twap" | "tpsl"`) with a shared store, scheduler, and HTTP DTO. TWAP reuses the scheduled-placement path (buy/sell, N slices over a window); TP/SL adds a price-trigger path (mark vs tp/sl → reduce-only full close). The order placer is generalized with `side` + `reduceOnly` + `sizeCoin`. Mobile gains union types, controller methods, and a segmented template picker.

**Tech Stack:** Server: TypeScript, Fastify, better-sqlite3, @nktkas/hyperliquid, jest/ts-jest. Mobile: Expo RN, TypeScript, Zustand, @testing-library/react-native, jest-expo.

**Spec:** `docs/superpowers/specs/2026-07-01-strategy-templates-twap-tpsl-design.md`

**Baselines (must stay green):** server `cd server && npx jest`; mobile `cd mobile && npx jest` (record the current pass count before starting; final count must be ≥ baseline).

---

## Phase 0 — Model generalization (server). DCA stays green.

### Task 0.1: Union strategy types

**Files:**
- Create: `server/src/strategies/types.ts`
- Test: `server/src/strategies/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// server/src/strategies/types.test.ts
import type { Strategy, DcaParams, TwapParams, TpslParams } from "./types";

describe("strategy types", () => {
  it("narrows params by kind (compile-time; asserted at runtime)", () => {
    const dca: Strategy = {
      id: "1", owner: "0xo", kind: "dca", status: "running", createdAt: 0,
      nextRunAt: 0, filledTotalUsdc: 0,
      params: { coin: "BTC", side: "buy", quoteAmountUsdc: 50, intervalHours: 24 } as DcaParams,
    };
    const twap: Strategy = {
      id: "2", owner: "0xo", kind: "twap", status: "running", createdAt: 0,
      nextRunAt: 0, filledTotalUsdc: 0, slicesDone: 0,
      params: { coin: "ETH", side: "sell", totalUsdc: 300, slices: 6, durationHours: 3 } as TwapParams,
    };
    const tpsl: Strategy = {
      id: "3", owner: "0xo", kind: "tpsl", status: "running", createdAt: 0,
      params: { coin: "SOL", takeProfitPrice: 200 } as TpslParams,
    };
    expect([dca.kind, twap.kind, tpsl.kind]).toEqual(["dca", "twap", "tpsl"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest src/strategies/types.test.ts`
Expected: FAIL — cannot find module `./types`.

- [ ] **Step 3: Write minimal implementation**

```ts
// server/src/strategies/types.ts
export type StrategyKind = "dca" | "twap" | "tpsl";
export type StrategyStatus = "running" | "paused" | "completed";

export interface DcaParams {
  coin: string;
  side: "buy";
  quoteAmountUsdc: number;
  intervalHours: number;
  maxTotalUsdc?: number;
}
export interface TwapParams {
  coin: string;
  side: "buy" | "sell";
  totalUsdc: number;
  slices: number;
  durationHours: number;
}
export interface TpslParams {
  coin: string;
  takeProfitPrice?: number;
  stopLossPrice?: number;
}
export type StrategyParams = DcaParams | TwapParams | TpslParams;

interface StrategyBase {
  id: string;
  owner: string;
  status: StrategyStatus;
  createdAt: number;
  nextRunAt?: number;
  filledTotalUsdc?: number;
  slicesDone?: number;
  triggeredAt?: number;
}

export type Strategy =
  | (StrategyBase & { kind: "dca"; params: DcaParams })
  | (StrategyBase & { kind: "twap"; params: TwapParams })
  | (StrategyBase & { kind: "tpsl"; params: TpslParams });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest src/strategies/types.test.ts && npx tsc --noEmit`
Expected: PASS, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add server/src/strategies/types.ts server/src/strategies/types.test.ts
git commit --no-verify -m "feat(strategies): discriminated-union strategy types"
```

---

### Task 0.2: Refactor `dca.ts` onto the union

`dca.ts` currently owns `DcaParams`/`DcaStrategy` and `dueStrategies`/`nextRunAt`/`dcaOrderSize`. Move params to `types.ts`, operate on `Strategy`, and rename the due helper to `dueDca`.

**Files:**
- Modify: `server/src/strategies/dca.ts`
- Modify: `server/src/strategies/dca.test.ts`

- [ ] **Step 1: Update the test to the new API**

```ts
// server/src/strategies/dca.test.ts
import { dueDca, dcaNextRunAt, dcaOrderSize } from "./dca";
import type { Strategy, DcaParams } from "./types";

const p: DcaParams = { coin: "BTC", side: "buy", quoteAmountUsdc: 50, intervalHours: 24 };
const s = (over: Partial<Strategy> = {}): Strategy => ({
  id: "s1", owner: "0xo", kind: "dca", status: "running", createdAt: 0,
  params: p, nextRunAt: 1000, filledTotalUsdc: 0, ...over,
} as Strategy);

describe("dca", () => {
  it("dueDca returns running dca strategies whose nextRunAt has passed", () => {
    const list = [
      s({ id: "a", nextRunAt: 500 }),
      s({ id: "b", nextRunAt: 5000 }),
      s({ id: "c", status: "paused", nextRunAt: 0 }),
    ];
    expect(dueDca(list, 1000).map((x) => x.id)).toEqual(["a"]);
  });

  it("skips strategies that hit maxTotalUsdc", () => {
    const capped = s({
      params: { ...p, maxTotalUsdc: 50 }, filledTotalUsdc: 50, nextRunAt: 0,
    });
    expect(dueDca([capped], 1000)).toEqual([]);
  });

  it("ignores non-dca kinds", () => {
    const twap = s({ id: "t", kind: "twap", params: { coin: "ETH", side: "buy", totalUsdc: 100, slices: 2, durationHours: 1 } } as Partial<Strategy>);
    expect(dueDca([twap], 1000)).toEqual([]);
  });

  it("dcaNextRunAt advances by the interval", () => {
    expect(dcaNextRunAt(p, 1000)).toBe(1000 + 24 * 3600 * 1000);
  });

  it("dcaOrderSize converts quote USDC to coin size at a price", () => {
    expect(dcaOrderSize(50, 50000)).toBeCloseTo(0.001, 9);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest src/strategies/dca.test.ts`
Expected: FAIL — `dueDca`/`dcaNextRunAt` not exported.

- [ ] **Step 3: Rewrite `dca.ts`**

```ts
// server/src/strategies/dca.ts
import type { Strategy, DcaParams } from "./types";
export type { DcaParams } from "./types";

/** Running DCA strategies whose next run is due and that haven't hit their optional total cap. */
export function dueDca(list: Strategy[], now: number): Strategy[] {
  return list.filter(
    (s) =>
      s.kind === "dca" &&
      s.status === "running" &&
      (s.nextRunAt ?? 0) <= now &&
      (s.params.maxTotalUsdc === undefined || (s.filledTotalUsdc ?? 0) < s.params.maxTotalUsdc),
  );
}

/** The next run timestamp = now + interval. */
export function dcaNextRunAt(params: DcaParams, now: number): number {
  return now + params.intervalHours * 3600 * 1000;
}

/** Coin size for a quote-USDC buy at `price`. */
export function dcaOrderSize(quoteUsdc: number, price: number): number {
  return price > 0 ? quoteUsdc / price : 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest src/strategies/dca.test.ts`
Expected: PASS. (tsc will fail until 0.3–0.5 update the consumers — expected; do not commit yet.)

- [ ] **Step 5: Commit after 0.5** (tsc is red until the store/scheduler/http are migrated). Proceed to 0.3.

---

### Task 0.3: Generalize `MemoryStrategyStore`

**Files:**
- Modify: `server/src/strategies/store.ts`
- Modify: `server/src/strategies/store.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// server/src/strategies/store.test.ts
import { MemoryStrategyStore } from "./store";
import type { TwapParams, TpslParams } from "./types";

describe("MemoryStrategyStore", () => {
  it("creates a dca strategy running at now with zeroed progress", () => {
    const store = new MemoryStrategyStore(() => 1000);
    const s = store.create("0xO", "dca", { coin: "BTC", side: "buy", quoteAmountUsdc: 50, intervalHours: 24 });
    expect(s).toMatchObject({ kind: "dca", status: "running", nextRunAt: 1000, filledTotalUsdc: 0, createdAt: 1000 });
  });

  it("creates a twap strategy with slicesDone 0", () => {
    const store = new MemoryStrategyStore(() => 1000);
    const p: TwapParams = { coin: "ETH", side: "sell", totalUsdc: 300, slices: 3, durationHours: 3 };
    const s = store.create("0xO", "twap", p);
    expect(s).toMatchObject({ kind: "twap", slicesDone: 0, filledTotalUsdc: 0, nextRunAt: 1000 });
  });

  it("creates a tpsl strategy with no schedule", () => {
    const store = new MemoryStrategyStore(() => 1000);
    const p: TpslParams = { coin: "SOL", stopLossPrice: 100 };
    const s = store.create("0xO", "tpsl", p);
    expect(s.kind).toBe("tpsl");
    expect(s.nextRunAt).toBeUndefined();
  });

  it("recordFill advances twap slicesDone and completes on the final slice", () => {
    const store = new MemoryStrategyStore(() => 1000);
    const s = store.create("0xO", "twap", { coin: "ETH", side: "buy", totalUsdc: 200, slices: 2, durationHours: 2 });
    store.recordFill(s.id, 100, 2000);
    expect(store.get(s.id)).toMatchObject({ slicesDone: 1, filledTotalUsdc: 100, status: "running", nextRunAt: 2000 });
    store.recordFill(s.id, 100, 3000);
    expect(store.get(s.id)).toMatchObject({ slicesDone: 2, status: "completed" });
  });

  it("recordTrigger marks a tpsl completed with triggeredAt", () => {
    const store = new MemoryStrategyStore(() => 1000);
    const s = store.create("0xO", "tpsl", { coin: "SOL", takeProfitPrice: 200 });
    store.recordTrigger(s.id, 4242);
    expect(store.get(s.id)).toMatchObject({ status: "completed", triggeredAt: 4242 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/strategies/store.test.ts`
Expected: FAIL — `create` arity / `recordTrigger` missing.

- [ ] **Step 3: Rewrite `store.ts`**

```ts
// server/src/strategies/store.ts
import { randomUUID } from "crypto";
import type { Strategy, StrategyKind, StrategyParams, StrategyStatus, DcaParams, TwapParams, TpslParams } from "./types";

/** Persistence boundary for strategies. */
export interface StrategyStore {
  create(owner: string, kind: StrategyKind, params: StrategyParams): Strategy;
  get(id: string): Strategy | undefined;
  list(owner: string): Strategy[];
  listAll(): Strategy[];
  setStatus(id: string, status: StrategyStatus): void;
  recordFill(id: string, quoteUsdc: number, nextRunAt: number): void;
  recordTrigger(id: string, now: number): void;
  remove(id: string): void;
}

function build(owner: string, kind: StrategyKind, params: StrategyParams, now: number): Strategy {
  const base = { id: randomUUID(), owner, status: "running" as const, createdAt: now };
  if (kind === "dca") return { ...base, kind, params: params as DcaParams, nextRunAt: now, filledTotalUsdc: 0 };
  if (kind === "twap") return { ...base, kind, params: params as TwapParams, nextRunAt: now, filledTotalUsdc: 0, slicesDone: 0 };
  return { ...base, kind, params: params as TpslParams };
}

/** In-memory store for tests/dev. `now` is injectable so scheduling is deterministic. */
export class MemoryStrategyStore implements StrategyStore {
  private byId = new Map<string, Strategy>();
  constructor(private now: () => number = () => Date.now()) {}

  create(owner: string, kind: StrategyKind, params: StrategyParams): Strategy {
    const s = build(owner, kind, params, this.now());
    this.byId.set(s.id, s);
    return s;
  }
  get(id: string): Strategy | undefined { return this.byId.get(id); }
  list(owner: string): Strategy[] { return this.listAll().filter((s) => s.owner.toLowerCase() === owner.toLowerCase()); }
  listAll(): Strategy[] { return [...this.byId.values()]; }

  setStatus(id: string, status: StrategyStatus): void {
    const s = this.byId.get(id);
    if (s) s.status = status;
  }

  recordFill(id: string, quoteUsdc: number, nextRunAt: number): void {
    const s = this.byId.get(id);
    if (!s) return;
    s.filledTotalUsdc = (s.filledTotalUsdc ?? 0) + quoteUsdc;
    s.nextRunAt = nextRunAt;
    if (s.kind === "twap") {
      s.slicesDone = (s.slicesDone ?? 0) + 1;
      if (s.slicesDone >= s.params.slices) s.status = "completed";
    }
  }

  recordTrigger(id: string, now: number): void {
    const s = this.byId.get(id);
    if (!s) return;
    s.triggeredAt = now;
    s.status = "completed";
  }

  remove(id: string): void { this.byId.delete(id); }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd server && npx jest src/strategies/store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit after 0.5.** Continue.

---

### Task 0.4: Generalize `SqliteStrategyStore` (+ column migration)

**Files:**
- Modify: `server/src/strategies/sqliteStore.ts`
- Modify: `server/src/strategies/sqliteStore.test.ts` (add cases mirroring 0.3)

- [ ] **Step 1: Add failing tests** mirroring the Memory store (create dca/twap/tpsl, recordFill twap completion, recordTrigger) but against `SqliteStrategyStore.open(":memory:", () => 1000)`. Reuse the assertions from Task 0.3 Step 1, replacing the constructor with:

```ts
import { SqliteStrategyStore } from "./sqliteStore";
const store = SqliteStrategyStore.open(":memory:", () => 1000);
```

Add one migration test:

```ts
it("migrates a legacy dca-only table by adding kind/created_at/slices_done/triggered_at", () => {
  const Database = require("better-sqlite3");
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE strategies (id TEXT PRIMARY KEY, owner TEXT NOT NULL, status TEXT NOT NULL, params TEXT NOT NULL, next_run_at INTEGER NOT NULL, filled_total_usdc REAL NOT NULL);`);
  db.prepare("INSERT INTO strategies VALUES (?,?,?,?,?,?)").run("old1", "0xo", "running", JSON.stringify({ coin: "BTC", side: "buy", quoteAmountUsdc: 50, intervalHours: 24 }), 0, 0);
  const cols = db.prepare("PRAGMA table_info(strategies)").all().map((c: { name: string }) => c.name);
  expect(cols).not.toContain("kind");
  const store = SqliteStrategyStore.fromDb(db, () => 1000);
  const s = store.get("old1");
  expect(s?.kind).toBe("dca");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/strategies/sqliteStore.test.ts`
Expected: FAIL.

- [ ] **Step 3: Rewrite `sqliteStore.ts`**

```ts
// server/src/strategies/sqliteStore.ts
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import type { StrategyStore } from "./store";
import type { Strategy, StrategyKind, StrategyParams, StrategyStatus, TwapParams } from "./types";

interface Row {
  id: string; owner: string; status: string; params: string;
  kind: string; next_run_at: number; filled_total_usdc: number;
  slices_done: number; triggered_at: number | null; created_at: number;
}

function toStrategy(row: Row): Strategy {
  const base = { id: row.id, owner: row.owner, status: row.status as StrategyStatus, createdAt: row.created_at };
  const params = JSON.parse(row.params);
  if (row.kind === "twap") return { ...base, kind: "twap", params, nextRunAt: row.next_run_at, filledTotalUsdc: row.filled_total_usdc, slicesDone: row.slices_done };
  if (row.kind === "tpsl") return { ...base, kind: "tpsl", params, triggeredAt: row.triggered_at ?? undefined };
  return { ...base, kind: "dca", params, nextRunAt: row.next_run_at, filledTotalUsdc: row.filled_total_usdc };
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS strategies (
      id TEXT PRIMARY KEY, owner TEXT NOT NULL, status TEXT NOT NULL, params TEXT NOT NULL,
      next_run_at INTEGER NOT NULL, filled_total_usdc REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS strategies_owner ON strategies(owner);
  `);
  const cols = new Set((db.prepare("PRAGMA table_info(strategies)").all() as { name: string }[]).map((c) => c.name));
  if (!cols.has("kind")) db.exec("ALTER TABLE strategies ADD COLUMN kind TEXT NOT NULL DEFAULT 'dca'");
  if (!cols.has("slices_done")) db.exec("ALTER TABLE strategies ADD COLUMN slices_done INTEGER NOT NULL DEFAULT 0");
  if (!cols.has("triggered_at")) db.exec("ALTER TABLE strategies ADD COLUMN triggered_at INTEGER");
  if (!cols.has("created_at")) db.exec("ALTER TABLE strategies ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0");
}

/** Durable `StrategyStore` over SQLite. Owner matching is case-insensitive. */
export class SqliteStrategyStore implements StrategyStore {
  private constructor(private db: Database.Database, private now: () => number) {}

  static open(path: string, now: () => number = () => Date.now()): SqliteStrategyStore {
    const db = new Database(path);
    db.pragma("journal_mode = WAL");
    migrate(db);
    return new SqliteStrategyStore(db, now);
  }
  /** For tests: adopt an existing db handle (also runs the migration). */
  static fromDb(db: Database.Database, now: () => number = () => Date.now()): SqliteStrategyStore {
    migrate(db);
    return new SqliteStrategyStore(db, now);
  }

  create(owner: string, kind: StrategyKind, params: StrategyParams): Strategy {
    const now = this.now();
    const id = randomUUID();
    const scheduled = kind === "tpsl" ? 0 : now;
    this.db
      .prepare(
        "INSERT INTO strategies (id, owner, status, params, kind, next_run_at, filled_total_usdc, slices_done, triggered_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      )
      .run(id, owner.toLowerCase(), "running", JSON.stringify(params), kind, scheduled, 0, 0, null, now);
    return this.get(id)!;
  }
  get(id: string): Strategy | undefined {
    const row = this.db.prepare("SELECT * FROM strategies WHERE id = ?").get(id) as Row | undefined;
    return row ? toStrategy(row) : undefined;
  }
  list(owner: string): Strategy[] {
    return (this.db.prepare("SELECT * FROM strategies WHERE owner = ?").all(owner.toLowerCase()) as Row[]).map(toStrategy);
  }
  listAll(): Strategy[] { return (this.db.prepare("SELECT * FROM strategies").all() as Row[]).map(toStrategy); }
  setStatus(id: string, status: StrategyStatus): void {
    this.db.prepare("UPDATE strategies SET status = ? WHERE id = ?").run(status, id);
  }
  recordFill(id: string, quoteUsdc: number, nextRunAt: number): void {
    const row = this.db.prepare("SELECT kind, params, slices_done FROM strategies WHERE id = ?").get(id) as
      | { kind: string; params: string; slices_done: number } | undefined;
    if (!row) return;
    this.db.prepare("UPDATE strategies SET filled_total_usdc = filled_total_usdc + ?, next_run_at = ? WHERE id = ?").run(quoteUsdc, nextRunAt, id);
    if (row.kind === "twap") {
      const done = row.slices_done + 1;
      const slices = (JSON.parse(row.params) as TwapParams).slices;
      this.db.prepare("UPDATE strategies SET slices_done = ? WHERE id = ?").run(done, id);
      if (done >= slices) this.db.prepare("UPDATE strategies SET status = 'completed' WHERE id = ?").run(id);
    }
  }
  recordTrigger(id: string, now: number): void {
    this.db.prepare("UPDATE strategies SET triggered_at = ?, status = 'completed' WHERE id = ?").run(now, id);
  }
  remove(id: string): void { this.db.prepare("DELETE FROM strategies WHERE id = ?").run(id); }
  close(): void { this.db.close(); }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd server && npx jest src/strategies/sqliteStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit after 0.5.** Continue.


---

### Task 0.5: Generalize the order placer (`side` + `reduceOnly` + `sizeCoin`)

**Files:**
- Modify: `server/src/engine/scheduler.ts` (the `PlaceRequest` interface lives here)
- Modify: `server/src/agent/placer.ts`
- Modify: `server/src/agent/placer.test.ts`

- [ ] **Step 1: Update the placer tests** to pass the new fields and assert the order flags.

```ts
// server/src/agent/placer.test.ts — representative cases (keep existing structure, update requests)
import { makeHlPlacer } from "./placer";

const deps = (orderSpy: (o: unknown) => void, price = 100, filled = { totalSz: "2", avgPx: "100" }) => ({
  clientFor: () => ({ order: async (params: { orders: unknown[] }) => { orderSpy(params.orders[0]); return { response: { data: { statuses: [{ filled }] } } }; } }),
  resolveAsset: async () => ({ assetIndex: 3, szDecimals: 2 }),
  resolvePrice: async () => price,
  slippageBps: 50,
});

it("buy notional order: b=true, r=false, aggressive up", async () => {
  let order: any;
  const placer = makeHlPlacer(deps((o) => (order = o)));
  const res = await placer.place({ owner: "0xo", coin: "BTC", cloid: "0xc", side: "buy", reduceOnly: false, sizeUsdc: 200 });
  expect(res.ok).toBe(true);
  expect(order.b).toBe(true);
  expect(order.r).toBe(false);
  expect(Number(order.p)).toBeGreaterThan(100); // +slip
  expect(order.s).toBe("2"); // 200 / 100
});

it("sell order: b=false, aggressive down", async () => {
  let order: any;
  const placer = makeHlPlacer(deps((o) => (order = o)));
  await placer.place({ owner: "0xo", coin: "BTC", cloid: "0xc", side: "sell", reduceOnly: false, sizeUsdc: 200 });
  expect(order.b).toBe(false);
  expect(Number(order.p)).toBeLessThan(100); // -slip
});

it("reduce-only close by coin size: r=true, uses sizeCoin", async () => {
  let order: any;
  const placer = makeHlPlacer(deps((o) => (order = o)));
  await placer.place({ owner: "0xo", coin: "BTC", cloid: "0xc", side: "sell", reduceOnly: true, sizeCoin: 1.5 });
  expect(order.r).toBe(true);
  expect(order.s).toBe("1.5");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/agent/placer.test.ts`
Expected: FAIL — `side`/`reduceOnly`/`sizeCoin` not on `PlaceRequest`.

- [ ] **Step 3a: Update `PlaceRequest` in `scheduler.ts`**

Replace the `PlaceRequest` interface with:

```ts
export interface PlaceRequest {
  owner: string;
  coin: string;
  cloid: string;
  side: "buy" | "sell";
  reduceOnly: boolean;
  sizeUsdc?: number;
  sizeCoin?: number;
}
```

- [ ] **Step 3b: Update `makeHlPlacer` in `placer.ts`** — replace the `place` body's sizing/flags:

```ts
async place(req: PlaceRequest): Promise<PlaceResult> {
  const client = deps.clientFor(req.owner);
  if (!client) return { ok: false };
  try {
    const price = await deps.resolvePrice(req.coin);
    if (!Number.isFinite(price) || price <= 0) return { ok: false };
    const { assetIndex, szDecimals } = await deps.resolveAsset(req.coin);
    const rawSize = req.sizeCoin !== undefined ? req.sizeCoin : (req.sizeUsdc ?? 0) / price;
    const size = roundSize(rawSize, szDecimals);
    if (size <= 0) return { ok: false };
    const buy = req.side === "buy";
    const limitPx = buy ? price * (1 + deps.slippageBps / 10_000) : price * (1 - deps.slippageBps / 10_000);
    const order = {
      a: assetIndex,
      b: buy,
      p: formatPrice(limitPx, szDecimals),
      s: roundSize(size, szDecimals).toString(),
      r: req.reduceOnly,
      t: { limit: { tif: "Ioc" as const } },
      c: req.cloid,
    };
    const res = await client.order({ orders: [order], grouping: "na" });
    const fill = fillOf(res);
    if (fill === undefined) return { ok: false };
    return { ok: true, ...fill };
  } catch {
    return { ok: false };
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd server && npx jest src/agent/placer.test.ts`
Expected: PASS.

- [ ] **Step 5:** Defer commit to Task 0.7 (tsc still red until the scheduler + http compile).

---

### Task 0.6: Generalize the scheduler `tick` (DCA behavior preserved)

Restructure `tick` to iterate all kinds. DCA keeps identical behavior; twap/tpsl branches are added empty-safe now and filled in Phase 1/2. Add an optional `tpsl` deps param (unused until Phase 2).

**Files:**
- Modify: `server/src/engine/scheduler.ts`
- Modify: `server/src/engine/scheduler.test.ts` (update `place` mocks to expect `side`/`reduceOnly`)

- [ ] **Step 1: Update the existing DCA scheduler test** so the placer stub/assertions include the new fields. Where a test asserts the placed request, expect `expect.objectContaining({ side: "buy", reduceOnly: false, sizeUsdc: <notional> })`. Keep all existing DCA assertions (cloid determinism, cap gating, advance-on-fill).

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/engine/scheduler.test.ts`
Expected: FAIL — requests now carry `side`/`reduceOnly`.

- [ ] **Step 3: Rewrite the `tick` function** (keep `dayStartUtcMs` and `cloidFor` as-is above it):

```ts
import type { StrategyStore } from "../strategies/store";
import { dueDca, dcaNextRunAt } from "../strategies/dca";
import { withinCaps, type RiskLimits } from "../risk/guards";
import type { DcaParams } from "../strategies/types";

/** Optional resolvers enabling the TP/SL trigger path (Phase 2). */
export interface TpslDeps {
  resolveMark(coin: string): Promise<number>;
  /** Signed position size (szi): >0 long, <0 short, undefined/0 = flat. */
  resolvePosition(owner: string, coin: string): Promise<number | undefined>;
}

export async function tick(
  store: StrategyStore,
  placer: OrderPlacer,
  limits: RiskLimits,
  killSwitch: boolean,
  now: number,
  activity?: ActivityRecorder,
  tpsl?: TpslDeps,
): Promise<void> {
  const all = store.listAll();

  // --- DCA: scheduled buys (unchanged behavior) ---
  for (const s of dueDca(all, now)) {
    const p = s.params as DcaParams;
    const notionalUsdc = p.quoteAmountUsdc;
    if (!withinCaps({ notionalUsdc, killSwitch, coin: p.coin }, limits).ok) continue;
    if (limits.dailyMaxNotionalUsdc !== undefined && activity?.notionalSince) {
      const spentToday = activity.notionalSince(s.owner, dayStartUtcMs(now));
      if (spentToday + notionalUsdc > limits.dailyMaxNotionalUsdc) continue;
    }
    const cloid = cloidFor(s.id, s.nextRunAt ?? now);
    const res = await placer.place({ owner: s.owner, coin: p.coin, sizeUsdc: notionalUsdc, cloid, side: "buy", reduceOnly: false });
    if (res.ok) {
      store.recordFill(s.id, res.filledUsdc ?? notionalUsdc, dcaNextRunAt(p, now));
      if (activity && res.filledSz !== undefined && res.avgPx !== undefined) {
        activity.record({ strategyId: s.id, owner: s.owner, time: now, coin: p.coin, side: p.side, sz: res.filledSz, px: res.avgPx });
      }
    }
  }

  // --- TWAP: filled in Phase 1 (Task 1.2) ---
  // --- TP/SL: filled in Phase 2 (Task 2.3) ---
  void tpsl;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd server && npx jest src/engine/scheduler.test.ts`
Expected: PASS.

- [ ] **Step 5:** Defer commit to Task 0.7.

---

### Task 0.7: Generalize the HTTP DTO + create validation, then land Phase 0

**Files:**
- Create: `server/src/strategies/validate.ts`
- Create: `server/src/strategies/validate.test.ts`
- Modify: `server/src/http/app.ts`
- Modify: `server/src/http/app.test.ts` (widen the create/list assertions)

- [ ] **Step 1: Write `validate.test.ts`**

```ts
// server/src/strategies/validate.test.ts
import { validateParams } from "./validate";

describe("validateParams", () => {
  it("accepts a valid dca", () => {
    expect(validateParams("dca", { coin: "BTC", side: "buy", quoteAmountUsdc: 50, intervalHours: 24 }).ok).toBe(true);
  });
  it("rejects dca with non-positive amount", () => {
    const r = validateParams("dca", { coin: "BTC", side: "buy", quoteAmountUsdc: 0, intervalHours: 24 });
    expect(r.ok).toBe(false);
  });
  it("accepts a valid twap (buy or sell)", () => {
    expect(validateParams("twap", { coin: "ETH", side: "sell", totalUsdc: 300, slices: 6, durationHours: 3 }).ok).toBe(true);
  });
  it("rejects twap with slices < 1 or non-integer", () => {
    expect(validateParams("twap", { coin: "ETH", side: "buy", totalUsdc: 300, slices: 0, durationHours: 3 }).ok).toBe(false);
    expect(validateParams("twap", { coin: "ETH", side: "buy", totalUsdc: 300, slices: 2.5, durationHours: 3 }).ok).toBe(false);
  });
  it("accepts tpsl with one of tp/sl and rejects neither", () => {
    expect(validateParams("tpsl", { coin: "SOL", takeProfitPrice: 200 }).ok).toBe(true);
    expect(validateParams("tpsl", { coin: "SOL" }).ok).toBe(false);
  });
  it("rejects an unknown kind", () => {
    expect(validateParams("nope" as never, {}).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/strategies/validate.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3a: Write `validate.ts`**

```ts
// server/src/strategies/validate.ts
import type { StrategyKind, StrategyParams, DcaParams, TwapParams, TpslParams } from "./types";

type Result = { ok: true; params: StrategyParams } | { ok: false; error: string };

export function validateParams(kind: StrategyKind, params: unknown): Result {
  const p = (params ?? {}) as Record<string, unknown>;
  const coin = p.coin;
  if (typeof coin !== "string" || coin.length === 0) return { ok: false, error: "coin required" };

  if (kind === "dca") {
    const d = p as unknown as DcaParams;
    if (d.side !== "buy") return { ok: false, error: "dca side must be buy" };
    if (!(Number(d.quoteAmountUsdc) > 0)) return { ok: false, error: "quoteAmountUsdc must be > 0" };
    if (!(Number(d.intervalHours) > 0)) return { ok: false, error: "intervalHours must be > 0" };
    return { ok: true, params: { coin, side: "buy", quoteAmountUsdc: d.quoteAmountUsdc, intervalHours: d.intervalHours, ...(d.maxTotalUsdc !== undefined ? { maxTotalUsdc: d.maxTotalUsdc } : {}) } };
  }
  if (kind === "twap") {
    const t = p as unknown as TwapParams;
    if (t.side !== "buy" && t.side !== "sell") return { ok: false, error: "twap side must be buy or sell" };
    if (!(Number(t.totalUsdc) > 0)) return { ok: false, error: "totalUsdc must be > 0" };
    if (!Number.isInteger(t.slices) || Number(t.slices) < 1) return { ok: false, error: "slices must be a positive integer" };
    if (!(Number(t.durationHours) > 0)) return { ok: false, error: "durationHours must be > 0" };
    return { ok: true, params: { coin, side: t.side, totalUsdc: t.totalUsdc, slices: t.slices, durationHours: t.durationHours } };
  }
  if (kind === "tpsl") {
    const x = p as unknown as TpslParams;
    const hasTp = x.takeProfitPrice !== undefined;
    const hasSl = x.stopLossPrice !== undefined;
    if (!hasTp && !hasSl) return { ok: false, error: "takeProfitPrice or stopLossPrice required" };
    if (hasTp && !(Number(x.takeProfitPrice) > 0)) return { ok: false, error: "takeProfitPrice must be > 0" };
    if (hasSl && !(Number(x.stopLossPrice) > 0)) return { ok: false, error: "stopLossPrice must be > 0" };
    return { ok: true, params: { coin, ...(hasTp ? { takeProfitPrice: x.takeProfitPrice } : {}), ...(hasSl ? { stopLossPrice: x.stopLossPrice } : {}) } };
  }
  return { ok: false, error: "unknown strategy kind" };
}
```

- [ ] **Step 3b: Update `http/app.ts`** — replace the DCA-specific `StrategyDto`/`toDto`, the imports, the `ownedStrategy` type, and the `POST /strategies` handler:

```ts
// imports (top of app.ts): drop DcaParams/DcaStrategy, add:
import type { Strategy, StrategyKind } from "../strategies/types";
import { validateParams } from "../strategies/validate";

interface StrategyDto {
  id: string;
  type: StrategyKind;
  status: string;
  params: Strategy["params"];
  filledTotalUsdc?: number;
  nextRunAt?: number;
  slicesDone?: number;
  triggeredAt?: number;
}

function toDto(s: Strategy): StrategyDto {
  return {
    id: s.id,
    type: s.kind,
    status: s.status,
    params: s.params,
    ...(s.filledTotalUsdc !== undefined ? { filledTotalUsdc: s.filledTotalUsdc } : {}),
    ...(s.nextRunAt !== undefined ? { nextRunAt: s.nextRunAt } : {}),
    ...(s.slicesDone !== undefined ? { slicesDone: s.slicesDone } : {}),
    ...(s.triggeredAt !== undefined ? { triggeredAt: s.triggeredAt } : {}),
  };
}
```

Replace the `POST /strategies` handler body:

```ts
app.post("/strategies", async (req, reply) => {
  const owner = ownerOf(req, reply);
  if (!owner) return;
  const { type, params } = req.body as { type: StrategyKind; params: unknown };
  const v = validateParams(type, params);
  if (!v.ok) return reply.code(400).send({ error: v.error });
  return toDto(deps.store.create(owner, type, v.params));
});
```

Change the `ownedStrategy` helper return type from `DcaStrategy` to `Strategy`.

- [ ] **Step 3c: Update `http/app.test.ts`** — the create test posts `{ type: "dca", params: {...} }` (already does); add a case asserting a bad body → 400:

```ts
it("rejects an invalid strategy with 400", async () => {
  const app = buildApp(deps());            // reuse the test's helper that returns AppDeps with an authed token
  const res = await app.inject({ method: "POST", url: "/strategies", headers: authHeader, payload: { type: "dca", params: { coin: "BTC", side: "buy", quoteAmountUsdc: 0, intervalHours: 24 } } });
  expect(res.statusCode).toBe(400);
});
```

- [ ] **Step 4: Run the full server suite + tsc**

Run: `cd server && npx tsc --noEmit && npx jest`
Expected: tsc clean; ALL suites PASS (DCA regression green).

- [ ] **Step 5: Commit Phase 0 (Tasks 0.2–0.7 together)**

```bash
git add server/src/strategies server/src/engine server/src/agent/placer.ts server/src/http
git commit --no-verify -m "refactor(strategies): generalize engine to a discriminated-union model

DCA behavior unchanged; store/scheduler/placer/DTO now kind-agnostic with
create validation. Foundation for TWAP + TP/SL."
```


## Phase 1 — TWAP (server → mobile).

### Task 1.1: TWAP pure logic

**Files:**
- Create: `server/src/strategies/twap.ts`
- Create: `server/src/strategies/twap.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// server/src/strategies/twap.test.ts
import { dueTwap, twapSliceUsdc, twapIntervalMs } from "./twap";
import type { Strategy, TwapParams } from "./types";

const p: TwapParams = { coin: "ETH", side: "buy", totalUsdc: 300, slices: 6, durationHours: 3 };
const s = (over: Partial<Strategy> = {}): Strategy => ({
  id: "t1", owner: "0xo", kind: "twap", status: "running", createdAt: 0,
  params: p, nextRunAt: 1000, filledTotalUsdc: 0, slicesDone: 0, ...over,
} as Strategy);

describe("twap", () => {
  it("dueTwap returns running twaps due and not yet fully sliced", () => {
    const list = [
      s({ id: "a", nextRunAt: 500 }),
      s({ id: "b", nextRunAt: 5000 }),
      s({ id: "c", nextRunAt: 0, slicesDone: 6 }), // all slices done
      s({ id: "d", status: "paused", nextRunAt: 0 }),
    ];
    expect(dueTwap(list, 1000).map((x) => x.id)).toEqual(["a"]);
  });
  it("twapSliceUsdc splits total evenly", () => {
    expect(twapSliceUsdc(p)).toBe(50);
  });
  it("twapIntervalMs = duration / slices", () => {
    expect(twapIntervalMs(p)).toBe((3 * 3600 * 1000) / 6);
  });
  it("guards against zero slices", () => {
    expect(twapSliceUsdc({ ...p, slices: 0 })).toBe(0);
    expect(twapIntervalMs({ ...p, slices: 0 })).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/strategies/twap.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write `twap.ts`**

```ts
// server/src/strategies/twap.ts
import type { Strategy, TwapParams } from "./types";

/** Running TWAP strategies whose next slice is due and that have slices remaining. */
export function dueTwap(list: Strategy[], now: number): Strategy[] {
  return list.filter(
    (s) =>
      s.kind === "twap" &&
      s.status === "running" &&
      (s.nextRunAt ?? 0) <= now &&
      (s.slicesDone ?? 0) < s.params.slices,
  );
}

/** Per-slice notional (USDC). */
export function twapSliceUsdc(p: TwapParams): number {
  return p.slices > 0 ? p.totalUsdc / p.slices : 0;
}

/** Milliseconds between slices = duration / slices. */
export function twapIntervalMs(p: TwapParams): number {
  return p.slices > 0 ? (p.durationHours * 3600 * 1000) / p.slices : 0;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd server && npx jest src/strategies/twap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/strategies/twap.ts server/src/strategies/twap.test.ts
git commit --no-verify -m "feat(twap): slice/interval/due pure logic"
```

---

### Task 1.2: Scheduler TWAP branch

**Files:**
- Modify: `server/src/engine/scheduler.ts`
- Modify: `server/src/engine/scheduler.test.ts`

- [ ] **Step 1: Write the failing test** (add to scheduler.test.ts)

```ts
it("places a TWAP slice, advances slicesDone, and completes on the final slice", async () => {
  const store = new MemoryStrategyStore(() => 0);
  const s = store.create("0xo", "twap", { coin: "ETH", side: "sell", totalUsdc: 100, slices: 2, durationHours: 2 });
  const placed: any[] = [];
  const placer = { place: async (r: any) => { placed.push(r); return { ok: true, filledUsdc: 50, filledSz: 0.5, avgPx: 100 }; } };
  const limits = { maxNotionalUsdc: 1000 };

  await tick(store, placer as any, limits, false, 0);
  expect(placed[0]).toMatchObject({ coin: "ETH", side: "sell", reduceOnly: false, sizeUsdc: 50 });
  expect(store.get(s.id)).toMatchObject({ slicesDone: 1, status: "running" });

  // second slice due after the interval
  const iv = (2 * 3600 * 1000) / 2;
  await tick(store, placer as any, limits, false, iv);
  expect(store.get(s.id)).toMatchObject({ slicesDone: 2, status: "completed" });
});

it("does not place a TWAP slice when the kill-switch is active", async () => {
  const store = new MemoryStrategyStore(() => 0);
  store.create("0xo", "twap", { coin: "ETH", side: "buy", totalUsdc: 100, slices: 2, durationHours: 2 });
  const placer = { place: jest.fn(async () => ({ ok: true, filledUsdc: 50 })) };
  await tick(store, placer as any, { maxNotionalUsdc: 1000 }, true, 0);
  expect(placer.place).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/engine/scheduler.test.ts`
Expected: FAIL — no slice placed (twap branch empty).

- [ ] **Step 3: Fill the TWAP branch** in `tick` (replace the `// --- TWAP: filled in Phase 1 ... ---` comment):

```ts
import { dueTwap, twapSliceUsdc, twapIntervalMs } from "../strategies/twap";
import type { TwapParams } from "../strategies/types";

// ... inside tick(), after the DCA loop:
for (const s of dueTwap(all, now)) {
  const p = s.params as TwapParams;
  const sliceUsdc = twapSliceUsdc(p);
  if (sliceUsdc <= 0) continue;
  if (!withinCaps({ notionalUsdc: sliceUsdc, killSwitch, coin: p.coin }, limits).ok) continue;
  if (limits.dailyMaxNotionalUsdc !== undefined && activity?.notionalSince) {
    const spentToday = activity.notionalSince(s.owner, dayStartUtcMs(now));
    if (spentToday + sliceUsdc > limits.dailyMaxNotionalUsdc) continue;
  }
  const cloid = cloidFor(s.id, s.nextRunAt ?? now);
  const res = await placer.place({ owner: s.owner, coin: p.coin, sizeUsdc: sliceUsdc, cloid, side: p.side, reduceOnly: false });
  if (res.ok) {
    store.recordFill(s.id, res.filledUsdc ?? sliceUsdc, now + twapIntervalMs(p));
    if (activity && res.filledSz !== undefined && res.avgPx !== undefined) {
      activity.record({ strategyId: s.id, owner: s.owner, time: now, coin: p.coin, side: p.side, sz: res.filledSz, px: res.avgPx });
    }
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd server && npx tsc --noEmit && npx jest src/engine/scheduler.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/engine/scheduler.ts server/src/engine/scheduler.test.ts
git commit --no-verify -m "feat(twap): scheduler slice placement + completion"
```

---

### Task 1.3: Mobile — union API types + generic `createStrategy`

**Files:**
- Modify: `mobile/src/services/strategyApi.ts`
- Modify: `mobile/src/services/strategyApi.test.ts`

- [ ] **Step 1: Update the strategyApi test** — change `createStrategy` calls to the two-arg form and add a twap case:

```ts
it("creates a DCA strategy with type + params in the body", async () => {
  const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => res({ id: "s2", type: "dca", params: {}, status: "running" }));
  const api = new StrategyApi("https://api", "tok", fetchMock as unknown as typeof fetch);
  await api.createStrategy("dca", { coin: "BTC", side: "buy", quoteAmountUsdc: 50, intervalHours: 24 });
  const init = (fetchMock.mock.calls[0][1] ?? {}) as RequestInit;
  expect(JSON.parse(init.body as string)).toEqual({ type: "dca", params: { coin: "BTC", side: "buy", quoteAmountUsdc: 50, intervalHours: 24 } });
});

it("creates a TWAP strategy", async () => {
  const fetchMock = jest.fn(async (_u: string, _i?: RequestInit) => res({ id: "s3", type: "twap", params: {}, status: "running" }));
  const api = new StrategyApi("https://api", "tok", fetchMock as unknown as typeof fetch);
  await api.createStrategy("twap", { coin: "ETH", side: "sell", totalUsdc: 300, slices: 6, durationHours: 3 });
  const init = (fetchMock.mock.calls[0][1] ?? {}) as RequestInit;
  expect(JSON.parse(init.body as string).type).toBe("twap");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/services/strategyApi.test.ts`
Expected: FAIL — `createStrategy` takes one arg.

- [ ] **Step 3: Update `strategyApi.ts`** — replace the type block and `createStrategy`:

```ts
export type StrategyType = "dca" | "twap" | "tpsl";

export interface DcaParams {
  coin: string; side: "buy"; quoteAmountUsdc: number; intervalHours: number; maxTotalUsdc?: number;
}
export interface TwapParams {
  coin: string; side: "buy" | "sell"; totalUsdc: number; slices: number; durationHours: number;
}
export interface TpslParams {
  coin: string; takeProfitPrice?: number; stopLossPrice?: number;
}
export type StrategyParams = DcaParams | TwapParams | TpslParams;

export interface Strategy {
  id: string;
  type: StrategyType;
  params: StrategyParams;
  status: "running" | "paused" | "completed";
  filledTotalUsdc?: number;
  nextRunAt?: number;
  slicesDone?: number;
  triggeredAt?: number;
}
```

Replace `createStrategy`:

```ts
createStrategy(type: StrategyType, params: StrategyParams) {
  return this.request<Strategy>("/strategies", "POST", { type, params });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/services/strategyApi.test.ts && npx tsc --noEmit`
Expected: test PASS; tsc will report errors in `useStrategyController`/`AgentScreen` (fixed in 1.4/1.5) — that's expected here.

- [ ] **Step 5:** Defer commit to Task 1.4 (controller must compile first).

---

### Task 1.4: Mobile — controller `createTwap`

**Files:**
- Modify: `mobile/src/hooks/useStrategyController.ts`
- Modify: `mobile/src/hooks/useStrategyController.test.ts`

- [ ] **Step 1: Update the existing `createDca` assertion and add a `createTwap` test.** The controller test uses the `makeApi()` helper + `approveAgent` stub already in the file.

Change the existing `createDca` assertion from the one-arg form to:

```ts
expect(api.createStrategy).toHaveBeenCalledWith("dca", { coin: "BTC", side: "buy", quoteAmountUsdc: 50, intervalHours: 24 });
```

Add:

```ts
it("createTwap creates a twap then refreshes", async () => {
  const api = makeApi();
  const { result } = renderHook(() => useStrategyController(api as never, approveAgent, "n"));
  await act(async () => {
    await result.current.createTwap({ coin: "ETH", side: "buy", totalUsdc: 300, slices: 6, durationHours: 3 });
  });
  expect(api.createStrategy).toHaveBeenCalledWith("twap", { coin: "ETH", side: "buy", totalUsdc: 300, slices: 6, durationHours: 3 });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/hooks/useStrategyController.test.ts`
Expected: FAIL — `createTwap` undefined.

- [ ] **Step 3: Update `useStrategyController.ts`** — imports + methods:

```ts
import type { StrategyApi, Strategy, DcaParams, TwapParams, TpslParams, AgentStatus } from "../services/strategyApi";

// replace createDca:
const createDca = useCallback(async (params: DcaParams) => {
  await api.createStrategy("dca", params);
  await refresh();
}, [api, refresh]);

const createTwap = useCallback(async (params: TwapParams) => {
  await api.createStrategy("twap", params);
  await refresh();
}, [api, refresh]);

const createTpsl = useCallback(async (params: TpslParams) => {
  await api.createStrategy("tpsl", params);
  await refresh();
}, [api, refresh]);

// add to the returned object:
return { approved: status.approved, status, strategies, busy, approveAgentFlow, revoke, createDca, createTwap, createTpsl, toggle, killAll, refresh };
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/hooks/useStrategyController.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit (1.3 + 1.4 together)**

```bash
git add mobile/src/services/strategyApi.ts mobile/src/services/strategyApi.test.ts mobile/src/hooks/useStrategyController.ts mobile/src/hooks/useStrategyController.test.ts
git commit --no-verify -m "feat(mobile): union strategy API + createTwap/createTpsl controller"
```

---

### Task 1.5: Mobile — template picker + TWAP form + rows + i18n

**Files:**
- Modify: `mobile/src/screens/AgentScreen.tsx`
- Modify: `mobile/src/screens/AgentScreen.test.tsx`
- Modify: `mobile/src/i18n/messages.ts` (en + zh)

- [ ] **Step 1: Add the i18n keys** to BOTH the `en` and `zh` maps in `messages.ts` (parity is enforced by `messages.test.ts`). English values shown; provide the matching Chinese values listed after.

```ts
// en
"agent.template": "Template",
"agent.templateDca": "DCA",
"agent.templateTwap": "TWAP",
"agent.templateTpsl": "TP / SL",
"agent.newTwap": "New TWAP",
"agent.side": "Side",
"agent.buy": "Buy",
"agent.sell": "Sell",
"agent.totalUsdc": "Total · USDC",
"agent.slices": "Slices",
"agent.durationHours": "Duration · hours",
"agent.createTwap": "Create TWAP",
"agent.newTpsl": "New TP / SL",
"agent.takeProfit": "Take-profit price",
"agent.stopLoss": "Stop-loss price",
"agent.createTpsl": "Create TP / SL",
"agent.tpslNeedsOne": "Enter a take-profit or stop-loss price",
"agent.strategyTwap": "{coin} TWAP",
"agent.strategyTpsl": "{coin} TP/SL",
"agent.twapProgress": "{done}/{total} slices · ${filled}",
"agent.statusCompleted": "Completed",
"agent.statusPaused": "Paused",
"agent.statusRunning": "Running",
```

```ts
// zh
"agent.template": "模板",
"agent.templateDca": "定投",
"agent.templateTwap": "TWAP",
"agent.templateTpsl": "止盈 / 止损",
"agent.newTwap": "新建 TWAP",
"agent.side": "方向",
"agent.buy": "买入",
"agent.sell": "卖出",
"agent.totalUsdc": "总额 · USDC",
"agent.slices": "份数",
"agent.durationHours": "时长 · 小时",
"agent.createTwap": "创建 TWAP",
"agent.newTpsl": "新建 止盈/止损",
"agent.takeProfit": "止盈价",
"agent.stopLoss": "止损价",
"agent.createTpsl": "创建 止盈/止损",
"agent.tpslNeedsOne": "请填写止盈价或止损价",
"agent.strategyTwap": "{coin} TWAP",
"agent.strategyTpsl": "{coin} 止盈/止损",
"agent.twapProgress": "{done}/{total} 份 · ${filled}",
"agent.statusCompleted": "已完成",
"agent.statusPaused": "已暂停",
"agent.statusRunning": "运行中",
```

- [ ] **Step 2: Update the existing DCA-create test + write the failing TWAP test.** The suite renders `<AgentScreen/>` with a mocked `strategyApi` (`mockApiFake`); the connected state is reached by pressing `strategy-connect-btn`.

First, update the existing "creates a DCA strategy from the form" assertion to the two-arg form:

```tsx
await waitFor(() =>
  expect(mockApiFake.createStrategy).toHaveBeenCalledWith("dca", { coin: "BTC", side: "buy", quoteAmountUsdc: 50, intervalHours: 24 }),
);
```

Then add:

```tsx
it("switches to the TWAP template and creates a TWAP", async () => {
  render(<AgentScreen />);
  fireEvent.press(screen.getByTestId("strategy-connect-btn"));
  await waitFor(() => expect(screen.getByTestId("template-twap")).toBeTruthy());
  fireEvent.press(screen.getByTestId("template-twap"));
  fireEvent.changeText(screen.getByTestId("twap-coin"), "ETH");
  fireEvent.changeText(screen.getByTestId("twap-total"), "300");
  fireEvent.changeText(screen.getByTestId("twap-slices"), "6");
  fireEvent.changeText(screen.getByTestId("twap-duration"), "3");
  fireEvent.press(screen.getByTestId("twap-create"));
  await waitFor(() =>
    expect(mockApiFake.createStrategy).toHaveBeenCalledWith("twap", { coin: "ETH", side: "buy", totalUsdc: 300, slices: 6, durationHours: 3 }),
  );
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd mobile && npx jest src/screens/AgentScreen.test.tsx`
Expected: FAIL — `template-twap` not found.

- [ ] **Step 4: Implement the picker + TWAP form** in `AgentScreen.tsx`. In `StrategyPanel`, add template state and render the matching form. Replace the single "New DCA" card with a template picker + switched form:

```tsx
type Template = "dca" | "twap" | "tpsl";
// inside StrategyPanel:
const [template, setTemplate] = useState<Template>("dca");
const [twapSide, setTwapSide] = useState<"buy" | "sell">("buy");
const [twapTotal, setTwapTotal] = useState("");
const [twapSlices, setTwapSlices] = useState("6");
const [twapDuration, setTwapDuration] = useState("3");

async function onCreateTwap() {
  const total = Number(twapTotal), slices = Number(twapSlices), dur = Number(twapDuration);
  if (!(total > 0) || !Number.isInteger(slices) || slices < 1 || !(dur > 0)) {
    Alert.alert(t("agent.invalidParams"), t("agent.invalidParamsBody"));
    return;
  }
  await ctrl.createTwap({ coin: coin.toUpperCase(), side: twapSide, totalUsdc: total, slices, durationHours: dur });
  setTwapTotal("");
}
```

Picker (segmented) above the form:

```tsx
<View style={styles.segment} testID="template-picker">
  {(["dca", "twap", "tpsl"] as Template[]).map((k) => (
    <Pressable
      key={k}
      testID={`template-${k}`}
      accessibilityRole="button"
      onPress={() => setTemplate(k)}
      style={[styles.segmentBtn, { borderColor: theme.line }, template === k && { backgroundColor: theme.surfaceStrong }]}
    >
      <Text style={[styles.segmentText, { color: template === k ? theme.text : theme.muted }]}>
        {t(k === "dca" ? "agent.templateDca" : k === "twap" ? "agent.templateTwap" : "agent.templateTpsl")}
      </Text>
    </Pressable>
  ))}
</View>
```

TWAP form card (rendered when `template === "twap"`):

```tsx
<SurfaceCard theme={theme} rule={false} testID="new-twap" style={styles.card}>
  <Text style={[styles.title, { color: theme.text }]}>{t("agent.newTwap")}</Text>
  <Field theme={theme} label={t("agent.coin")} value={coin} onChangeText={setCoin} autoCap testID="twap-coin" />
  <View style={styles.sideRow}>
    <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("agent.side")}</Text>
    <View style={styles.sideBtns}>
      {(["buy", "sell"] as const).map((sd) => (
        <Pressable key={sd} testID={`twap-side-${sd}`} accessibilityRole="button" onPress={() => setTwapSide(sd)}
          style={[styles.sideBtn, { borderColor: theme.line }, twapSide === sd && { backgroundColor: theme.surfaceStrong }]}>
          <Text style={[styles.segmentText, { color: twapSide === sd ? theme.text : theme.muted }]}>{t(sd === "buy" ? "agent.buy" : "agent.sell")}</Text>
        </Pressable>
      ))}
    </View>
  </View>
  <Field theme={theme} label={t("agent.totalUsdc")} value={twapTotal} onChangeText={setTwapTotal} keyboard testID="twap-total" />
  <Field theme={theme} label={t("agent.slices")} value={twapSlices} onChangeText={setTwapSlices} keyboard testID="twap-slices" />
  <Field theme={theme} label={t("agent.durationHours")} value={twapDuration} onChangeText={setTwapDuration} keyboard testID="twap-duration" />
  <Pressable onPress={onCreateTwap} accessibilityRole="button" testID="twap-create" style={[styles.cta, { backgroundColor: theme.brand }]}>
    <Text style={[styles.ctaText, { color: theme.bg }]}>{t("agent.createTwap")}</Text>
  </Pressable>
</SurfaceCard>
```

Wrap the existing DCA card so it renders only when `template === "dca"`. Add styles `segment`, `segmentBtn`, `segmentText`, `sideRow`, `sideBtns`, `sideBtn` (use only theme tokens — no hardcoded hex). If `theme.surfaceStrong` does not exist, use `theme.surface`.

Update `StrategyRow` to render per kind:

```tsx
function StrategyRow({ theme, strategy, onToggle }: { theme: ThemeTokens; strategy: Strategy; onToggle: () => void }) {
  const t = useT();
  const title =
    strategy.type === "twap" ? t("agent.strategyTwap", { coin: strategy.params.coin })
    : strategy.type === "tpsl" ? t("agent.strategyTpsl", { coin: strategy.params.coin })
    : t("agent.strategyDca", { coin: (strategy.params as DcaParams).coin });
  const sub =
    strategy.type === "twap"
      ? t("agent.twapProgress", { done: String(strategy.slicesDone ?? 0), total: String((strategy.params as TwapParams).slices), filled: String(Math.round(strategy.filledTotalUsdc ?? 0)) })
      : strategy.type === "tpsl"
      ? [(strategy.params as TpslParams).takeProfitPrice ? `TP ${(strategy.params as TpslParams).takeProfitPrice}` : "", (strategy.params as TpslParams).stopLossPrice ? `SL ${(strategy.params as TpslParams).stopLossPrice}` : ""].filter(Boolean).join(" · ")
      : `$${(strategy.params as DcaParams).quoteAmountUsdc} / ${(strategy.params as DcaParams).intervalHours}h`;
  const completed = strategy.status === "completed";
  return (
    <SurfaceCard theme={theme} rule={false} testID={`strategy-${strategy.id}`} style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.hint, { color: theme.muted }]}>{sub}</Text>
      </View>
      {completed ? (
        <Text style={[styles.hint, { color: theme.faint }]}>{t("agent.statusCompleted")}</Text>
      ) : (
        <Toggle theme={theme} value={strategy.status === "running"} onValueChange={onToggle} accessibilityLabel={`toggle-${strategy.id}`} />
      )}
    </SurfaceCard>
  );
}
```

Add the imports `TwapParams, TpslParams` (and keep `DcaParams`) from `../services/strategyApi`.

- [ ] **Step 5: Run gates + commit**

Run: `cd mobile && npx tsc --noEmit && npx jest && npx jest noHardcodedColors`
Then emoji grep: `grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" src/screens/AgentScreen.tsx src/i18n/messages.ts || echo "no emoji"`
Expected: tsc clean; jest ≥ baseline; noHardcodedColors PASS; "no emoji".

```bash
git add mobile/src/screens/AgentScreen.tsx mobile/src/screens/AgentScreen.test.tsx mobile/src/i18n/messages.ts
git commit --no-verify -m "feat(mobile): TWAP template — picker, form, per-kind rows, i18n"
```

---

## Phase 2 — TP/SL (server → mobile).

### Task 2.1: TP/SL pure trigger logic

**Files:**
- Create: `server/src/strategies/tpsl.ts`
- Create: `server/src/strategies/tpsl.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// server/src/strategies/tpsl.test.ts
import { tpslTriggered, closeSide } from "./tpsl";
import type { TpslParams } from "./types";

describe("tpsl", () => {
  const tp: TpslParams = { coin: "BTC", takeProfitPrice: 110 };
  const sl: TpslParams = { coin: "BTC", stopLossPrice: 90 };
  const both: TpslParams = { coin: "BTC", takeProfitPrice: 110, stopLossPrice: 90 };

  it("long: take-profit fires when mark >= tp", () => {
    expect(tpslTriggered(tp, +1, 110)).toBe(true);
    expect(tpslTriggered(tp, +1, 109)).toBe(false);
  });
  it("long: stop-loss fires when mark <= sl", () => {
    expect(tpslTriggered(sl, +1, 90)).toBe(true);
    expect(tpslTriggered(sl, +1, 91)).toBe(false);
  });
  it("short: take-profit fires when mark <= tp", () => {
    expect(tpslTriggered(tp, -1, 110)).toBe(true);
    expect(tpslTriggered(tp, -1, 111)).toBe(false);
  });
  it("short: stop-loss fires when mark >= sl", () => {
    expect(tpslTriggered(sl, -1, 90)).toBe(true);
    expect(tpslTriggered(sl, -1, 89)).toBe(false);
  });
  it("both levels: either side triggers", () => {
    expect(tpslTriggered(both, +1, 110)).toBe(true);
    expect(tpslTriggered(both, +1, 90)).toBe(true);
    expect(tpslTriggered(both, +1, 100)).toBe(false);
  });
  it("flat position never triggers", () => {
    expect(tpslTriggered(both, 0, 110)).toBe(false);
  });
  it("closeSide is opposite the position", () => {
    expect(closeSide(+1)).toBe("sell");
    expect(closeSide(-1)).toBe("buy");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/strategies/tpsl.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write `tpsl.ts`**

```ts
// server/src/strategies/tpsl.ts
import type { TpslParams } from "./types";

/** True when `mark` has crossed a configured tp/sl for a position of sign `szi` (>0 long, <0 short). */
export function tpslTriggered(p: TpslParams, szi: number, mark: number): boolean {
  if (szi > 0) {
    if (p.takeProfitPrice !== undefined && mark >= p.takeProfitPrice) return true;
    if (p.stopLossPrice !== undefined && mark <= p.stopLossPrice) return true;
  } else if (szi < 0) {
    if (p.takeProfitPrice !== undefined && mark <= p.takeProfitPrice) return true;
    if (p.stopLossPrice !== undefined && mark >= p.stopLossPrice) return true;
  }
  return false;
}

/** The reduce-only close side for a position: long closes with a sell, short with a buy. */
export function closeSide(szi: number): "buy" | "sell" {
  return szi > 0 ? "sell" : "buy";
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd server && npx jest src/strategies/tpsl.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/strategies/tpsl.ts server/src/strategies/tpsl.test.ts
git commit --no-verify -m "feat(tpsl): trigger + close-side pure logic"
```

---

### Task 2.2: Position resolver (`positionSzi` + `resolvePosition`)

**Files:**
- Modify: `server/src/agent/hlMeta.ts`
- Modify: `server/src/agent/hlMeta.test.ts`
- Modify: `server/src/agent/hlRuntime.ts` (add `resolvePosition` to `makeResolvers`)

- [ ] **Step 1: Write the failing test** (hlMeta.test.ts)

```ts
import { positionSzi } from "./hlMeta";

describe("positionSzi", () => {
  const state = { assetPositions: [
    { position: { coin: "BTC", szi: "0.5" } },
    { position: { coin: "ETH", szi: "-2" } },
  ] };
  it("returns the signed size for a held coin", () => {
    expect(positionSzi(state, "BTC")).toBe(0.5);
    expect(positionSzi(state, "ETH")).toBe(-2);
  });
  it("returns 0 when the coin is not held or state is empty", () => {
    expect(positionSzi(state, "SOL")).toBe(0);
    expect(positionSzi({}, "BTC")).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/agent/hlMeta.test.ts`
Expected: FAIL — `positionSzi` not exported.

- [ ] **Step 3a: Add to `hlMeta.ts`**

```ts
/** HL clearinghouse state (subset): open positions with their signed size `szi`. */
export interface ClearinghouseState {
  assetPositions?: { position?: { coin?: string; szi?: string } }[];
}

/** Signed position size for a coin (>0 long, <0 short); 0 if flat/absent/unparseable. */
export function positionSzi(state: ClearinghouseState, coin: string): number {
  const found = state.assetPositions?.find((ap) => ap.position?.coin === coin);
  const szi = Number(found?.position?.szi);
  return Number.isFinite(szi) ? szi : 0;
}
```

- [ ] **Step 3b: Extend `makeResolvers` in `hlRuntime.ts`** — add a `resolvePosition` that reads clearinghouse state:

```ts
import { assetIndexFromMeta, priceFromMids, positionSzi, type PerpMeta, type ClearinghouseState } from "./hlMeta";

// inside makeResolvers's returned object, add:
resolvePosition: async (owner: string, coin: string): Promise<number | undefined> => {
  const state = (await info.clearinghouseState({ user: owner })) as unknown as ClearinghouseState;
  const szi = positionSzi(state, coin);
  return szi === 0 ? undefined : szi;
},
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd server && npx tsc --noEmit && npx jest src/agent/hlMeta.test.ts`
Expected: tsc clean; PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/agent/hlMeta.ts server/src/agent/hlMeta.test.ts server/src/agent/hlRuntime.ts
git commit --no-verify -m "feat(tpsl): position resolver via clearinghouseState"
```

---

### Task 2.3: Scheduler TP/SL branch

**Files:**
- Modify: `server/src/engine/scheduler.ts`
- Modify: `server/src/engine/scheduler.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("closes a long position (reduce-only sell) when take-profit triggers", async () => {
  const store = new MemoryStrategyStore(() => 0);
  const s = store.create("0xo", "tpsl", { coin: "BTC", takeProfitPrice: 110 });
  const placed: any[] = [];
  const placer = { place: async (r: any) => { placed.push(r); return { ok: true, filledSz: 0.5, avgPx: 110 }; } };
  const tpsl = { resolveMark: async () => 111, resolvePosition: async () => 0.5 };
  await tick(store, placer as any, { maxNotionalUsdc: 1e9 }, false, 0, undefined, tpsl);
  expect(placed[0]).toMatchObject({ coin: "BTC", side: "sell", reduceOnly: true, sizeCoin: 0.5 });
  expect(store.get(s.id)).toMatchObject({ status: "completed", triggeredAt: 0 });
});

it("does not trigger when mark has not crossed", async () => {
  const store = new MemoryStrategyStore(() => 0);
  store.create("0xo", "tpsl", { coin: "BTC", takeProfitPrice: 110, stopLossPrice: 90 });
  const placer = { place: jest.fn(async () => ({ ok: true })) };
  const tpsl = { resolveMark: async () => 100, resolvePosition: async () => 0.5 };
  await tick(store, placer as any, { maxNotionalUsdc: 1e9 }, false, 0, undefined, tpsl);
  expect(placer.place).not.toHaveBeenCalled();
});

it("skips when there is no position", async () => {
  const store = new MemoryStrategyStore(() => 0);
  store.create("0xo", "tpsl", { coin: "BTC", stopLossPrice: 90 });
  const placer = { place: jest.fn(async () => ({ ok: true })) };
  const tpsl = { resolveMark: async () => 80, resolvePosition: async () => undefined };
  await tick(store, placer as any, { maxNotionalUsdc: 1e9 }, false, 0, undefined, tpsl);
  expect(placer.place).not.toHaveBeenCalled();
});

it("kill-switch blocks the tpsl close", async () => {
  const store = new MemoryStrategyStore(() => 0);
  store.create("0xo", "tpsl", { coin: "BTC", takeProfitPrice: 110 });
  const placer = { place: jest.fn(async () => ({ ok: true })) };
  const tpsl = { resolveMark: async () => 120, resolvePosition: async () => 0.5 };
  await tick(store, placer as any, { maxNotionalUsdc: 1e9 }, true, 0, undefined, tpsl);
  expect(placer.place).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/engine/scheduler.test.ts`
Expected: FAIL — tpsl branch is a no-op.

- [ ] **Step 3: Fill the TP/SL branch** — replace the `void tpsl;` placeholder from Task 0.6 with:

```ts
import { tpslTriggered, closeSide } from "../strategies/tpsl";
import type { TpslParams } from "../strategies/types";

// ... inside tick(), after the TWAP loop:
if (tpsl) {
  for (const s of all) {
    if (s.kind !== "tpsl" || s.status !== "running") continue;
    if (killSwitch) continue;
    const p = s.params as TpslParams;
    const szi = await tpsl.resolvePosition(s.owner, p.coin);
    if (szi === undefined || szi === 0) continue;
    const mark = await tpsl.resolveMark(p.coin);
    if (!Number.isFinite(mark) || mark <= 0) continue;
    if (!tpslTriggered(p, szi, mark)) continue;
    const cloid = cloidFor(s.id, now);
    const side = closeSide(szi);
    const res = await placer.place({ owner: s.owner, coin: p.coin, sizeCoin: Math.abs(szi), cloid, side, reduceOnly: true });
    if (res.ok) {
      if (activity && res.filledSz !== undefined && res.avgPx !== undefined) {
        activity.record({ strategyId: s.id, owner: s.owner, time: now, coin: p.coin, side, sz: res.filledSz, px: res.avgPx });
      }
      // Complete only when the close covers the position. A partial fill leaves the strategy
      // running; the next tick re-evaluates the smaller (still-triggered) position and re-closes.
      // reduceOnly makes repeated closes safe (they can only shrink the position, never flip it).
      const covered = res.filledSz === undefined || res.filledSz + 1e-9 >= Math.abs(szi);
      if (covered) store.recordTrigger(s.id, now);
    }
  }
}
```

Delete the now-unused `void tpsl;` line.

- [ ] **Step 4: Run to verify it passes**

Run: `cd server && npx tsc --noEmit && npx jest src/engine/scheduler.test.ts`
Expected: tsc clean; PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/engine/scheduler.ts server/src/engine/scheduler.test.ts
git commit --no-verify -m "feat(tpsl): scheduler trigger path — reduce-only close on cross"
```

---

### Task 2.4: Wire the TP/SL resolvers into the running scheduler

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Update the composition root** — keep a reference to the resolvers and pass the `tpsl` deps into `tick`:

```ts
// replace the placer construction:
const resolvers = makeResolvers(info, 60_000, now);
const placer = makeHlPlacer({
  clientFor: makeClientFor(agents, transport, now),
  ...resolvers,
  slippageBps,
});

// replace the tick call inside setInterval:
void tick(
  store,
  placer,
  { maxNotionalUsdc, perCoinMaxNotionalUsdc, dailyMaxNotionalUsdc },
  killSwitch,
  now(),
  activity,
  { resolveMark: resolvers.resolvePrice, resolvePosition: resolvers.resolvePosition },
).catch((e) => console.error("scheduler tick failed", e)); // eslint-disable-line no-console
```

- [ ] **Step 2: Verify the whole server compiles + full suite**

Run: `cd server && npx tsc --noEmit && npx jest`
Expected: tsc clean; ALL suites PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit --no-verify -m "feat(tpsl): wire mark/position resolvers into the scheduler loop"
```

---

### Task 2.5: Mobile — TP/SL form

The picker button (`template-tpsl`), per-kind rows, `createTpsl` (controller), and i18n keys were added in Phase 1 (Tasks 1.4, 1.5). This task adds the TP/SL form card.

**Files:**
- Modify: `mobile/src/screens/AgentScreen.tsx`
- Modify: `mobile/src/screens/AgentScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("switches to the TP/SL template and creates a stop-only tpsl", async () => {
  render(<AgentScreen />);
  fireEvent.press(screen.getByTestId("strategy-connect-btn"));
  await waitFor(() => expect(screen.getByTestId("template-tpsl")).toBeTruthy());
  fireEvent.press(screen.getByTestId("template-tpsl"));
  fireEvent.changeText(screen.getByTestId("tpsl-coin"), "BTC");
  fireEvent.changeText(screen.getByTestId("tpsl-tp"), "110");
  fireEvent.press(screen.getByTestId("tpsl-create"));
  await waitFor(() =>
    expect(mockApiFake.createStrategy).toHaveBeenCalledWith("tpsl", { coin: "BTC", takeProfitPrice: 110 }),
  );
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/screens/AgentScreen.test.tsx`
Expected: FAIL — `tpsl-coin` not found.

- [ ] **Step 3: Add the TP/SL form** in `StrategyPanel` (state + handler + card rendered when `template === "tpsl"`):

```tsx
const [tp, setTp] = useState("");
const [sl, setSl] = useState("");

async function onCreateTpsl() {
  const tpN = tp ? Number(tp) : undefined;
  const slN = sl ? Number(sl) : undefined;
  const bad = (tpN === undefined && slN === undefined) || (tpN !== undefined && !(tpN > 0)) || (slN !== undefined && !(slN > 0));
  if (bad) { Alert.alert(t("agent.invalidParams"), t("agent.tpslNeedsOne")); return; }
  await ctrl.createTpsl({ coin: coin.toUpperCase(), ...(tpN !== undefined ? { takeProfitPrice: tpN } : {}), ...(slN !== undefined ? { stopLossPrice: slN } : {}) });
  setTp(""); setSl("");
}
```

```tsx
{template === "tpsl" && (
  <SurfaceCard theme={theme} rule={false} testID="new-tpsl" style={styles.card}>
    <Text style={[styles.title, { color: theme.text }]}>{t("agent.newTpsl")}</Text>
    <Field theme={theme} label={t("agent.coin")} value={coin} onChangeText={setCoin} autoCap testID="tpsl-coin" />
    <Field theme={theme} label={t("agent.takeProfit")} value={tp} onChangeText={setTp} keyboard testID="tpsl-tp" />
    <Field theme={theme} label={t("agent.stopLoss")} value={sl} onChangeText={setSl} keyboard testID="tpsl-sl" />
    <Pressable onPress={onCreateTpsl} accessibilityRole="button" testID="tpsl-create" style={[styles.cta, { backgroundColor: theme.brand }]}>
      <Text style={[styles.ctaText, { color: theme.bg }]}>{t("agent.createTpsl")}</Text>
    </Pressable>
  </SurfaceCard>
)}
```

- [ ] **Step 4: Run the gates**

Run: `cd mobile && npx tsc --noEmit && npx jest && npx jest noHardcodedColors`
Then emoji grep: `grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" src/screens/AgentScreen.tsx || echo "no emoji"`
Expected: tsc clean; jest ≥ baseline; noHardcodedColors PASS; "no emoji".

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/AgentScreen.tsx mobile/src/screens/AgentScreen.test.tsx
git commit --no-verify -m "feat(mobile): TP/SL template form"
```

---

## Final verification

- [ ] **Server full suite:** `cd server && npx tsc --noEmit && npx jest` — all green, DCA regression intact.
- [ ] **Mobile full suite + gates:** `cd mobile && npx tsc --noEmit && npx jest` (≥ baseline) `&& npx jest noHardcodedColors`; emoji grep across changed files → "no emoji".
- [ ] **i18n parity:** `cd mobile && npx jest src/i18n/messages.test.ts` — en/zh key parity holds.
- [ ] Report the final server + mobile pass counts vs the recorded baselines. Await the user's explicit "push".
