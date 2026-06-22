import { FundingsService } from "./fundingsData";
import type { FundingsInfoLike, RawFunding } from "../lib/hyperliquid/types";

const funding = (over: Partial<RawFunding["delta"]>, time = 1000): RawFunding => ({
  time,
  hash: ("0x" + "2".repeat(64)) as `0x${string}`,
  delta: { type: "funding", coin: "BTC", usdc: "-0.25", szi: "0.01", fundingRate: "0.0000125", nSamples: 1, ...over },
});

class FakeFundingsInfo implements FundingsInfoLike {
  userFunding = jest.fn(async (_a: string, _s: number, _e?: number): Promise<RawFunding[]> => [
    funding({ coin: "BTC", usdc: "-0.25" }, 200),
    funding({ coin: "ETH", usdc: "0.10" }, 100),
  ]);
}

describe("FundingsService", () => {
  it("loads + normalizes funding events (newest first), passing the time window", async () => {
    const info = new FakeFundingsInfo();
    const out = await new FundingsService(info).load("0xabc", 50);
    expect(info.userFunding).toHaveBeenCalledWith("0xabc", 50, undefined);
    expect(out.map((f) => f.coin)).toEqual(["BTC", "ETH"]); // time desc
    expect(out[0].usdc).toBe(-0.25);
  });

  it("defaults startTime to 0 when not provided", async () => {
    const info = new FakeFundingsInfo();
    await new FundingsService(info).load("0xabc");
    expect(info.userFunding).toHaveBeenCalledWith("0xabc", 0, undefined);
  });
});
