import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { MemoryActivityStore, SqliteActivityStore, type ActivityStore } from "./activityStore";

function contract(name: string, make: () => ActivityStore) {
  describe(name, () => {
    it("records fills and lists them newest-first, scoped to owner+strategy", () => {
      const store = make();
      const a = store.record({ strategyId: "s1", owner: "0xO", time: 100, coin: "BTC", side: "buy", sz: 0.001, px: 50000 });
      store.record({ strategyId: "s1", owner: "0xo", time: 200, coin: "BTC", side: "buy", sz: 0.002, px: 51000 });
      store.record({ strategyId: "s2", owner: "0xo", time: 300, coin: "ETH", side: "buy", sz: 1, px: 2500 });

      expect(a.id).toBeTruthy();
      const list = store.list("0xo", "s1");
      expect(list.map((x) => x.time)).toEqual([200, 100]); // newest-first
      expect(list[0]).toMatchObject({ coin: "BTC", side: "buy", sz: 0.002, px: 51000 });
      expect(store.list("0xo", "s2")).toHaveLength(1);
      expect(store.list("0xother", "s1")).toHaveLength(0);
    });

    it("notionalSince sums sz*px for an owner since a time (across strategies)", () => {
      const store = make();
      store.record({ strategyId: "s1", owner: "0xo", time: 100, coin: "BTC", side: "buy", sz: 0.001, px: 50000 }); // 50
      store.record({ strategyId: "s2", owner: "0xo", time: 300, coin: "ETH", side: "buy", sz: 1, px: 2500 }); // 2500
      store.record({ strategyId: "s1", owner: "0xother", time: 300, coin: "BTC", side: "buy", sz: 1, px: 1 });

      expect(store.notionalSince("0xo", 0)).toBeCloseTo(2550, 6);
      expect(store.notionalSince("0xo", 200)).toBeCloseTo(2500, 6); // only the t=300 fill
      expect(store.notionalSince("0xnobody", 0)).toBe(0);
    });
  });
}

contract("MemoryActivityStore", () => new MemoryActivityStore());

describe("listRecent", () => {
  function seed(store: MemoryActivityStore | SqliteActivityStore) {
    store.record({ strategyId: "s1", owner: "0xOwner", time: 100, coin: "BTC", side: "buy", sz: 0.1, px: 50000 });
    store.record({ strategyId: "s2", owner: "0xOwner", time: 300, coin: "ETH", side: "sell", sz: 1, px: 1600 });
    store.record({ strategyId: "s1", owner: "0xOwner", time: 200, coin: "BTC", side: "buy", sz: 0.2, px: 51000 });
    store.record({ strategyId: "s9", owner: "0xOther", time: 400, coin: "SOL", side: "buy", sz: 5, px: 100 });
  }

  it.each([
    ["memory", () => new MemoryActivityStore()],
    ["sqlite", () => SqliteActivityStore.open(":memory:")],
  ])("%s: newest-first across strategies, owner-scoped, capped by limit", (_n, make) => {
    const store = make();
    seed(store);
    const recent = store.listRecent("0xOwner", 2);
    expect(recent.map((r) => r.time)).toEqual([300, 200]); // newest first, other owner excluded, capped at 2
    expect(recent.every((r) => r.owner === "0xowner")).toBe(true);
  });
});

describe("SqliteActivityStore", () => {
  contract("contract", () => SqliteActivityStore.open(":memory:"));

  it("persists activity across a reopen", () => {
    const dir = mkdtempSync(join(tmpdir(), "hs-act-"));
    const file = join(dir, "a.db");
    try {
      SqliteActivityStore.open(file).record({ strategyId: "s1", owner: "0xo", time: 100, coin: "BTC", side: "buy", sz: 0.001, px: 50000 });
      expect(SqliteActivityStore.open(file).list("0xo", "s1")).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
