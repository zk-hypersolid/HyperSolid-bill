import { validateParams } from "./validate";

describe("validateParams", () => {
  it("accepts a valid dca", () => {
    expect(validateParams("dca", { coin: "BTC", side: "buy", quoteAmountUsdc: 50, intervalHours: 24 }).ok).toBe(true);
  });
  it("rejects dca with non-positive amount", () => {
    const r = validateParams("dca", { coin: "BTC", side: "buy", quoteAmountUsdc: 0, intervalHours: 24 });
    expect(r.ok).toBe(false);
  });
  it("rejects dca with numeric strings", () => {
    const r = validateParams("dca", { coin: "BTC", side: "buy", quoteAmountUsdc: "50", intervalHours: "24" });
    expect(r.ok).toBe(false);
  });
  it("accepts a valid twap (buy or sell)", () => {
    expect(validateParams("twap", { coin: "ETH", side: "sell", totalUsdc: 300, slices: 6, durationHours: 3 }).ok).toBe(true);
  });
  it("rejects twap with slices < 1 or non-integer", () => {
    expect(validateParams("twap", { coin: "ETH", side: "buy", totalUsdc: 300, slices: 0, durationHours: 3 }).ok).toBe(false);
    expect(validateParams("twap", { coin: "ETH", side: "buy", totalUsdc: 300, slices: 2.5, durationHours: 3 }).ok).toBe(false);
  });
  it("rejects twap with numeric strings", () => {
    expect(validateParams("twap", { coin: "ETH", side: "buy", totalUsdc: "300", slices: "6", durationHours: "3" }).ok).toBe(false);
  });
  it("accepts tpsl with one of tp/sl and rejects neither", () => {
    expect(validateParams("tpsl", { coin: "SOL", takeProfitPrice: 200 }).ok).toBe(true);
    expect(validateParams("tpsl", { coin: "SOL" }).ok).toBe(false);
  });
  it("rejects tpsl with numeric strings", () => {
    expect(validateParams("tpsl", { coin: "SOL", takeProfitPrice: "200" }).ok).toBe(false);
  });
  it("rejects an unknown kind", () => {
    expect(validateParams("nope" as never, {}).ok).toBe(false);
  });
});
