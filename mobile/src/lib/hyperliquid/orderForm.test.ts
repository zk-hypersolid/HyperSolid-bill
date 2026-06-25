import {
  orderTypeShape,
  toBaseSize,
  requiredMargin,
  TAKER_FEE_RATE,
  MAKER_FEE_RATE,
  type TicketOrderType,
} from "./orderForm";

describe("orderTypeShape", () => {
  const cases: Array<[TicketOrderType, boolean, boolean, boolean, "tp" | "sl"]> = [
    ["market", false, false, false, "sl"],
    ["limit", false, false, true, "sl"],
    ["stopLimit", true, false, true, "sl"],
    ["stopMarket", true, true, false, "sl"],
    ["tpLimit", true, false, true, "tp"],
    ["tpMarket", true, true, false, "tp"],
  ];
  it.each(cases)("%s → trigger/triggerMarket/limitPrice/tpsl", (type, isTrigger, triggerIsMarket, usesLimitPrice, tpsl) => {
    expect(orderTypeShape(type)).toEqual({ isTrigger, triggerIsMarket, usesLimitPrice, tpsl });
  });
});

describe("toBaseSize", () => {
  it("returns the value as-is for base units", () => {
    expect(toBaseSize("base", 0.5, 60000)).toBe(0.5);
  });
  it("divides by price for quote (USDC) units", () => {
    expect(toBaseSize("quote", 6000, 60000)).toBe(0.1);
  });
  it("guards zero/negative value and price", () => {
    expect(toBaseSize("quote", 6000, 0)).toBe(0);
    expect(toBaseSize("base", 0, 60000)).toBe(0);
    expect(toBaseSize("quote", -5, 60000)).toBe(0);
  });
});

describe("requiredMargin", () => {
  it("is notional / leverage", () => {
    expect(requiredMargin(1000, 10)).toBe(100);
    expect(requiredMargin(1000, 0)).toBe(0);
  });
});

describe("fee rates", () => {
  it("match the HL base perp tier", () => {
    expect(TAKER_FEE_RATE).toBeCloseTo(0.00045);
    expect(MAKER_FEE_RATE).toBeCloseTo(0.00015);
  });
});
