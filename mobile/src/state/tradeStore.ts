import { create } from "zustand";

interface TradeState {
  /** Coin the Trade tab should open, set when navigating from market detail; null = keep current. */
  selectedCoin: string | null;
  setSelectedCoin: (coin: string) => void;
  clearSelectedCoin: () => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  selectedCoin: null,
  setSelectedCoin: (coin) => set({ selectedCoin: coin.toUpperCase() }),
  clearSelectedCoin: () => set({ selectedCoin: null }),
}));
