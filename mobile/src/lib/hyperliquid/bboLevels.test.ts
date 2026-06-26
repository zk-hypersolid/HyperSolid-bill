import { bboPrice } from "./bboLevels";
import type { Orderbook } from "./types";

const book: Orderbook = {
  asks: [
    { px: 101, sz: 1, total: 1 },
    { px: 102, sz: 1, total: 2 },
    { px: 103, sz: 1, total: 3 },
    { px: 104, sz: 1, total: 4 },
    { px: 105, sz: 1, total: 5 },
  ],
  bids: [
    { px: 99, sz: 1, total: 1 },
    { px: 98, sz: 1, total: 2 },
    { px: 97, sz: 1, total: 3 },
    { px: 96, sz: 1, total: 4 },
    { px: 95, sz: 1, total: 5 },
  ],
  spread: 2,
  spreadPct: 0.02,
};

describe("bboPrice", () => {
  it("counterparty for a buy lifts the ask (best, then 5th)", () => {
    expect(bboPrice(book, "opp1", "buy")).toBe(101);
    expect(bboPrice(book, "opp5", "buy")).toBe(105);
  });

  it("counterparty for a sell hits the bid", () => {
    expect(bboPrice(book, "opp1", "sell")).toBe(99);
    expect(bboPrice(book, "opp5", "sell")).toBe(95);
  });

  it("queue for a buy joins the bid; queue for a sell joins the ask", () => {
    expect(bboPrice(book, "queue1", "buy")).toBe(99);
    expect(bboPrice(book, "queue1", "sell")).toBe(101);
    expect(bboPrice(book, "queue5", "buy")).toBe(95);
    expect(bboPrice(book, "queue5", "sell")).toBe(105);
  });

  it("clamps the level to the available depth and returns 0 for an empty side", () => {
    const shallow: Orderbook = { asks: [{ px: 101, sz: 1, total: 1 }], bids: [], spread: 0, spreadPct: 0 };
    expect(bboPrice(shallow, "opp5", "buy")).toBe(101);
    expect(bboPrice(shallow, "opp1", "sell")).toBe(0);
  });
});
