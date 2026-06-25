import { groupOrderbook } from "./orderbookGroup";
import type { Orderbook } from "./types";

const book: Orderbook = {
  asks: [
    { px: 101, sz: 1, total: 1 },
    { px: 103, sz: 2, total: 3 },
    { px: 108, sz: 1, total: 4 },
  ],
  bids: [
    { px: 99, sz: 1, total: 1 },
    { px: 97, sz: 2, total: 3 },
    { px: 92, sz: 1, total: 4 },
  ],
  spread: 2,
  spreadPct: 0.02,
};

describe("groupOrderbook", () => {
  it("buckets asks up and bids down to the tick, summing size + cumulative totals", () => {
    const g = groupOrderbook(book, 10);
    // asks 101,103 -> bucket 110; 108 -> bucket 110 too => all into 110 (ceil(101/10)*10=110)
    expect(g.asks).toEqual([{ px: 110, sz: 4, total: 4 }]);
    // bids 99,97,92 -> floor to 90 => one bucket
    expect(g.bids).toEqual([{ px: 90, sz: 4, total: 4 }]);
  });

  it("returns the book unchanged for a non-positive tick", () => {
    expect(groupOrderbook(book, 0)).toBe(book);
  });

  it("keeps separate buckets and recomputes cumulative totals", () => {
    const g = groupOrderbook(book, 5);
    // asks: 101->105, 103->105, 108->110 => [105: sz3 tot3, 110: sz1 tot4]
    expect(g.asks).toEqual([
      { px: 105, sz: 3, total: 3 },
      { px: 110, sz: 1, total: 4 },
    ]);
    // bids: 99->95, 97->95, 92->90 => [95: sz3 tot3, 90: sz1 tot4]
    expect(g.bids).toEqual([
      { px: 95, sz: 3, total: 3 },
      { px: 90, sz: 1, total: 4 },
    ]);
  });
});
