import { sma, ema, bollinger, rsi } from "./indicators";

describe("indicators", () => {
  it("sma averages over the window, null until the window fills", () => {
    expect(sma([2, 4, 6, 8], 2)).toEqual([null, 3, 5, 7]);
  });

  it("ema seeds on the first sma then smooths", () => {
    const out = ema([1, 2, 3, 4, 5], 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).toBeCloseTo(2, 5); // seed = sma of first 3
    expect(out[3]).toBeCloseTo(3, 5); // 4*0.5 + 2*0.5
  });

  it("bollinger returns mid/upper/lower bands at 2σ", () => {
    const { upper, mid, lower } = bollinger([1, 2, 3, 4, 5], 5, 2);
    expect(mid[4]).toBe(3);
    expect(upper[4]).toBeGreaterThan(3);
    expect(lower[4]).toBeLessThan(3);
  });

  it("rsi is 100 for a monotonically rising series", () => {
    const out = rsi([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 14);
    expect(out[out.length - 1]).toBeCloseTo(100, 5);
  });
});
