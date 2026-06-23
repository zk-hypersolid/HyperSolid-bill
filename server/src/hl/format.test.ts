import { roundSize, formatPrice, stripTrailingZeros } from "./format";

describe("hl/format", () => {
  it("roundSize rounds to szDecimals (lot size)", () => {
    expect(roundSize(0.0012345, 3)).toBe(0.001);
    expect(roundSize(1.2367, 2)).toBe(1.24);
  });

  it("stripTrailingZeros trims fractional zeros", () => {
    expect(stripTrailingZeros("1.2300")).toBe("1.23");
    expect(stripTrailingZeros("100")).toBe("100");
    expect(stripTrailingZeros("1.000")).toBe("1");
  });

  it("formatPrice keeps integers and clamps to 5 sig figs / (6 - szDecimals) decimals for perps", () => {
    expect(formatPrice(123456, 2)).toBe("123456");
    expect(formatPrice(2512.345678, 2)).toBe("2512.3");
    expect(formatPrice(0.0123456, 0)).toBe("0.012346");
  });
});
