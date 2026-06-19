import { useWalletStore } from "./walletStore";
import type { WalletService } from "../wallet/types";

const fakeWallet: WalletService = {
  getAddress: () => "0xabc0000000000000000000000000000000000001",
  signMessage: async () => "0x",
  signTypedData: async () => "0x",
};

describe("walletStore", () => {
  beforeEach(() => useWalletStore.setState({ mode: "none", address: null, wallet: null }));

  it("starts disconnected", () => {
    expect(useWalletStore.getState().mode).toBe("none");
    expect(useWalletStore.getState().address).toBeNull();
  });

  it("sets a local wallet and derives address", () => {
    useWalletStore.getState().setLocalWallet(fakeWallet);
    expect(useWalletStore.getState().mode).toBe("local");
    expect(useWalletStore.getState().address).toBe(fakeWallet.getAddress());
    expect(useWalletStore.getState().wallet).toBe(fakeWallet);
  });

  it("sets view-only mode with no wallet", () => {
    useWalletStore.getState().setViewOnly("0xdef0000000000000000000000000000000000002");
    expect(useWalletStore.getState().mode).toBe("viewOnly");
    expect(useWalletStore.getState().wallet).toBeNull();
    expect(useWalletStore.getState().address).toMatch(/^0xdef/);
  });

  it("resets to disconnected", () => {
    useWalletStore.getState().setLocalWallet(fakeWallet);
    useWalletStore.getState().reset();
    expect(useWalletStore.getState().mode).toBe("none");
  });
});
