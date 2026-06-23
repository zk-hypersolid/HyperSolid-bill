import { withinCaps } from "./guards";

describe("withinCaps", () => {
  it("rejects an order above the per-order notional cap", () => {
    expect(withinCaps({ notionalUsdc: 200, killSwitch: false }, { maxNotionalUsdc: 100 }).ok).toBe(false);
  });
  it("rejects everything when the kill-switch is on", () => {
    expect(withinCaps({ notionalUsdc: 10, killSwitch: true }, { maxNotionalUsdc: 100 }).ok).toBe(false);
  });
  it("accepts an order within caps", () => {
    expect(withinCaps({ notionalUsdc: 50, killSwitch: false }, { maxNotionalUsdc: 100 }).ok).toBe(true);
  });
});
