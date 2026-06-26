import { pctFromX, snapPct } from "./Slider";

describe("pctFromX", () => {
  it("maps a touch x to a 0–100 percentage of the track width", () => {
    expect(pctFromX(0, 200)).toBe(0);
    expect(pctFromX(100, 200)).toBe(50);
    expect(pctFromX(200, 200)).toBe(100);
  });
  it("clamps out-of-range touches", () => {
    expect(pctFromX(-20, 200)).toBe(0);
    expect(pctFromX(260, 200)).toBe(100);
  });
  it("returns 0 for a zero-width track (not yet measured)", () => {
    expect(pctFromX(50, 0)).toBe(0);
  });
});

describe("snapPct", () => {
  it("rounds to the nearest quarter notch", () => {
    expect(snapPct(0)).toBe(0);
    expect(snapPct(12)).toBe(0);
    expect(snapPct(13)).toBe(25);
    expect(snapPct(40)).toBe(50);
    expect(snapPct(63)).toBe(75);
    expect(snapPct(100)).toBe(100);
  });
});
