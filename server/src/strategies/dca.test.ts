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
