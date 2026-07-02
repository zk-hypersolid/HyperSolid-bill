import { assetIndexFromMeta, priceFromMids, positionSzi } from "./hlMeta";

describe("hl meta parsing", () => {
  const meta = { universe: [{ name: "BTC", szDecimals: 5 }, { name: "ETH", szDecimals: 4 }] };

  it("resolves a coin's perp asset index + szDecimals from meta", () => {
    expect(assetIndexFromMeta(meta, "ETH")).toEqual({ assetIndex: 1, szDecimals: 4 });
    expect(assetIndexFromMeta(meta, "BTC")).toEqual({ assetIndex: 0, szDecimals: 5 });
  });

  it("throws for an unknown coin", () => {
    expect(() => assetIndexFromMeta(meta, "DOGE")).toThrow(/DOGE/);
  });

  it("reads a coin's mid price from allMids", () => {
    expect(priceFromMids({ BTC: "50000.5", ETH: "2500" }, "ETH")).toBe(2500);
    expect(priceFromMids({ BTC: "50000.5" }, "ETH")).toBe(0);
  });
});

describe("positionSzi", () => {
  const state = { assetPositions: [
    { position: { coin: "BTC", szi: "0.5" } },
    { position: { coin: "ETH", szi: "-2" } },
  ] };
  it("returns the signed size for a held coin", () => {
    expect(positionSzi(state, "BTC")).toBe(0.5);
    expect(positionSzi(state, "ETH")).toBe(-2);
  });
  it("returns 0 when the coin is not held or state is empty", () => {
    expect(positionSzi(state, "SOL")).toBe(0);
    expect(positionSzi({}, "BTC")).toBe(0);
  });
});
