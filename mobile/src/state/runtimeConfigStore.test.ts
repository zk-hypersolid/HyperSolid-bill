import { useRuntimeConfigStore, arbitrumRpcFor } from "./runtimeConfigStore";

describe("runtimeConfigStore", () => {
  beforeEach(() => {
    useRuntimeConfigStore.setState({ arbitrumRpc: { mainnet: null, testnet: null } });
  });

  it("starts empty (nothing delivered yet)", () => {
    expect(arbitrumRpcFor("mainnet")).toBeNull();
    expect(arbitrumRpcFor("testnet")).toBeNull();
  });

  it("exposes the server-delivered RPC per network", () => {
    useRuntimeConfigStore.getState().setConfig({
      arbitrumRpc: { mainnet: "https://rpc.mainnet/key", testnet: "https://rpc.testnet/key" },
    });
    expect(arbitrumRpcFor("mainnet")).toBe("https://rpc.mainnet/key");
    expect(arbitrumRpcFor("testnet")).toBe("https://rpc.testnet/key");
  });
});
