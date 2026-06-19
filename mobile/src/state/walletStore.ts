import { create } from "zustand";
import type { WalletService } from "../wallet/types";

export type WalletMode = "none" | "local" | "viewOnly";

interface WalletState {
  mode: WalletMode;
  address: string | null;
  wallet: WalletService | null;
  setLocalWallet: (wallet: WalletService) => void;
  setViewOnly: (address: string) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  mode: "none",
  address: null,
  wallet: null,
  setLocalWallet: (wallet) => set({ mode: "local", wallet, address: wallet.getAddress() }),
  setViewOnly: (address) => set({ mode: "viewOnly", wallet: null, address }),
  reset: () => set({ mode: "none", wallet: null, address: null }),
}));
