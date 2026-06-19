import { normalizePortfolio } from "./positions";
import type { RawClearinghouseState } from "./types";

const raw: RawClearinghouseState = {
  marginSummary: { accountValue: "1000", totalNtlPos: "500", totalMarginUsed: "100" },
  withdrawable: "800",
  assetPositions: [
    {
      position: {
        coin: "BTC",
        szi: "0.5",
        entryPx: "60000",
        positionValue: "31000",
        unrealizedPnl: "1000",
        liquidationPx: "45000",
        marginUsed: "60",
        leverage: { type: "cross", value: 10 },
      },
    },
    {
      position: {
        coin: "ETH",
        szi: "-2",
        entryPx: "3000",
        positionValue: "6000",
        unrealizedPnl: "-200",
        liquidationPx: null,
        marginUsed: "40",
        leverage: { type: "isolated", value: 5 },
      },
    },
  ],
};

describe("normalizePortfolio", () => {
  it("maps account summary numbers", () => {
    const { summary } = normalizePortfolio(raw);
    expect(summary.accountValue).toBe(1000);
    expect(summary.withdrawable).toBe(800);
  });

  it("derives long/short side from signed size", () => {
    const { positions } = normalizePortfolio(raw);
    expect(positions[0]).toMatchObject({ coin: "BTC", side: "long", size: 0.5, leverage: 10 });
    expect(positions[1]).toMatchObject({ coin: "ETH", side: "short", size: 2 });
  });

  it("sums total unrealized pnl across positions", () => {
    expect(normalizePortfolio(raw).summary.totalUnrealizedPnl).toBe(800); // 1000 - 200
  });

  it("preserves null liquidation price", () => {
    expect(normalizePortfolio(raw).positions[1].liquidationPx).toBeNull();
  });

  it("handles empty portfolio", () => {
    const empty = normalizePortfolio({
      marginSummary: { accountValue: "0", totalNtlPos: "0", totalMarginUsed: "0" },
      withdrawable: "0",
      assetPositions: [],
    });
    expect(empty.positions).toEqual([]);
    expect(empty.summary.totalUnrealizedPnl).toBe(0);
  });
});
