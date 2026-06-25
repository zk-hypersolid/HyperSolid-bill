import { pctFromX } from "./Slider";

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
