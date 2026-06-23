import { appConfigFromEnv } from "./appConfig";

describe("appConfigFromEnv", () => {
  it("maps env vars into the app-config payload the mobile app expects", () => {
    const cfg = appConfigFromEnv({
      ARBITRUM_RPC_MAINNET: "https://arb-main.example/key",
      ARBITRUM_RPC_TESTNET: "https://arb-test.example/key",
      WITHDRAW_FEE_USDC_MAINNET: "1",
      WITHDRAW_FEE_USDC_TESTNET: "0",
      STRATEGY_API_BASE_URL: "https://api.example",
    });
    expect(cfg).toEqual({
      arbitrumRpc: { mainnet: "https://arb-main.example/key", testnet: "https://arb-test.example/key" },
      withdrawFeeUsdc: { mainnet: 1, testnet: 0 },
      strategyApiBaseUrl: "https://api.example",
    });
  });

  it("returns nulls for absent vars and ignores non-numeric fees", () => {
    const cfg = appConfigFromEnv({ WITHDRAW_FEE_USDC_MAINNET: "abc" });
    expect(cfg).toEqual({
      arbitrumRpc: { mainnet: null, testnet: null },
      withdrawFeeUsdc: { mainnet: null, testnet: null },
      strategyApiBaseUrl: null,
    });
  });
});
