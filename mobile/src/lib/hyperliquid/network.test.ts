import { resolveIsTestnet } from "./network";

describe("resolveIsTestnet", () => {
  it("maps testnet to true", () => {
    expect(resolveIsTestnet("testnet")).toBe(true);
  });
  it("maps mainnet to false", () => {
    expect(resolveIsTestnet("mainnet")).toBe(false);
  });
});
