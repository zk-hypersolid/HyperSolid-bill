import { sma, ema, bollinger, rsi, macd, kdj, sar } from "./indicators";

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

  it("macd returns macd/signal/histogram; macd > 0 for a strong uptrend", () => {
    const v = Array.from({ length: 60 }, (_, i) => i + 1);
    const { macd: m, signal, histogram } = macd(v);
    expect(m.length).toBe(60);
    expect(m[59]).not.toBeNull();
    expect(m[59]!).toBeGreaterThan(0); // fast EMA above slow EMA in an uptrend
    expect(histogram[59]!).toBeCloseTo(m[59]! - signal[59]!, 6);
  });

  it("kdj rises above 50 for an uptrend and satisfies J = 3K - 2D", () => {
    const n = 30;
    const highs = Array.from({ length: n }, (_, i) => i + 2);
    const lows = Array.from({ length: n }, (_, i) => i);
    const closes = Array.from({ length: n }, (_, i) => i + 1.5);
    const { k, d, j } = kdj(highs, lows, closes, 9);
    expect(k[n - 1]!).toBeGreaterThan(50);
    expect(j[n - 1]!).toBeCloseTo(3 * k[n - 1]! - 2 * d[n - 1]!, 6);
  });

  it("sar stays below the bar in a steady uptrend", () => {
    const n = 20;
    const highs = Array.from({ length: n }, (_, i) => 10 + i);
    const lows = Array.from({ length: n }, (_, i) => 9 + i);
    const out = sar(highs, lows);
    expect(out.length).toBe(n);
    expect(out[n - 1]!).toBeLessThanOrEqual(lows[n - 1]);
  });
});
