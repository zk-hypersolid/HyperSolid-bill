import { FillsService } from "./fillsData";
import type { FillsInfoLike, RawUserFill } from "../lib/hyperliquid/types";

const fill = (over: Partial<RawUserFill>): RawUserFill => ({
  coin: "BTC",
  px: "60000",
  sz: "0.01",
  side: "B",
  time: 1000,
  startPosition: "0",
  dir: "Open Long",
  closedPnl: "0",
  hash: ("0x" + "1".repeat(64)) as `0x${string}`,
  oid: 1,
  crossed: true,
  fee: "0.5",
  tid: 100,
  feeToken: "USDC",
  twapId: null,
  ...over,
});

class FakeFillsInfo implements FillsInfoLike {
  userFills = jest.fn(async (_a: string): Promise<RawUserFill[]> => [
    fill({ tid: 2, time: 200, builderFee: "0.1" }),
    fill({ tid: 1, time: 100 }),
    fill({ tid: 2, time: 200 }), // duplicate tid
  ]);
  userFillsByTime = jest.fn(
    async (_a: string, _s: number, _e: number): Promise<RawUserFill[]> => [
      fill({ tid: 0, time: 50, side: "A" }),
    ],
  );
}

describe("FillsService", () => {
  it("loadRecent normalizes + dedupes by tid (newest first) with builderFee", async () => {
    const info = new FakeFillsInfo();
    const out = await new FillsService(info).loadRecent("0xabc");
    expect(info.userFills).toHaveBeenCalledWith("0xabc");
    expect(out.map((f) => f.tid)).toEqual([2, 1]); // deduped, time desc
    expect(out[0].builderFee).toBe(0.1);
  });

  it("loadBefore paginates older fills via userFillsByTime", async () => {
    const info = new FakeFillsInfo();
    const out = await new FillsService(info).loadBefore("0xabc", 100);
    expect(info.userFillsByTime).toHaveBeenCalledWith("0xabc", 0, 100);
    expect(out.map((f) => f.tid)).toEqual([0]);
    expect(out[0].side).toBe("sell");
  });
});
