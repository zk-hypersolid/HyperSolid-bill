import { create } from "zustand";

export type StartTab = "Markets" | "Account";

interface OnboardingState {
  /** Whether the first-run welcome has been dismissed this session. */
  welcomeSeen: boolean;
  /** Which tab to land on after the welcome (Account when the user chose "Get started"). */
  startTab: StartTab;
  dismiss: (startTab: StartTab) => void;
}

/**
 * First-run guidance state. In-memory (mirrors `themeStore`/`localeStore`/`envStore`): a no-wallet
 * user sees the welcome each fresh launch until they pick "Get started" (→ Wallet) or "Browse first"
 * (→ Markets). Once a wallet exists the app is `locked`/connected and the welcome never shows.
 */
export const useOnboardingStore = create<OnboardingState>((set) => ({
  welcomeSeen: false,
  startTab: "Markets",
  dismiss: (startTab) => set({ welcomeSeen: true, startTab }),
}));
