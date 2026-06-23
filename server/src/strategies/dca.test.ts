import { dueStrategies, nextRunAt, dcaOrderSize, type DcaStrategy } from "./dca";

const s = (over: Partial<DcaStrategy> = {}): DcaStrategy => ({
  id: "s1",
  owner: "0xo",
  status: "running",
  params: { coin: "BTC", side: "buy", quoteAmountUsdc: 50, intervalHours: 24 },
  nextRunAt: 1000,
  filledTotalUsdc: 0,
  ...over,
});

describe("dca", () => {
  it("dueStrategies returns running strategies whose nextRunAt has passed", () => {
    const list = [
      s({ id: "a", nextRunAt: 500 }),
      s({ id: "b", nextRunAt: 5000 }),
      s({ id: "c", status: "paused", nextRunAt: 0 }),
    ];
    expect(dueStrategies(list, 1000).map((x) => x.id)).toEqual(["a"]);
  });

  it("skips strategies that hit maxTotalUsdc", () => {
    const capped = s({
      params: { coin: "BTC", side: "buy", quoteAmountUsdc: 50, intervalHours: 24, maxTotalUsdc: 50 },
      filledTotalUsdc: 50,
      nextRunAt: 0,
    });
    expect(dueStrategies([capped], 1000)).toEqual([]);
  });

  it("nextRunAt advances by the interval", () => {
    expect(nextRunAt(s({ nextRunAt: 1000 }), 1000)).toBe(1000 + 24 * 3600 * 1000);
  });

  it("dcaOrderSize converts quote USDC to coin size at a price", () => {
    expect(dcaOrderSize(50, 50000)).toBeCloseTo(0.001, 9);
  });
});
