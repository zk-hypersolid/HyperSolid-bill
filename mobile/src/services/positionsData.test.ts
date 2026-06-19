import { PositionsService } from "./positionsData";
import type { PositionsInfoLike, RawClearinghouseState } from "../lib/hyperliquid/types";

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
  ],
};

class FakeInfo implements PositionsInfoLike {
  clearinghouseState = jest.fn(async (_a: string): Promise<RawClearinghouseState> => raw);
}

describe("PositionsService", () => {
  it("loads and normalizes a portfolio for an address", async () => {
    const info = new FakeInfo();
    const svc = new PositionsService(info);
    const out = await svc.loadPortfolio("0xabc");
    expect(info.clearinghouseState).toHaveBeenCalledWith("0xabc");
    expect(out.summary.accountValue).toBe(1000);
    expect(out.positions[0].coin).toBe("BTC");
  });
});
