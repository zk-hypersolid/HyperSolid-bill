import { create } from "zustand";

export type AuthStatus = "unknown" | "noWallet" | "needsPinSetup" | "locked" | "unlocked";

interface AuthState {
  status: AuthStatus;
  lastActiveAt: number;
  evaluate: (hasWallet: () => Promise<boolean>, hasPin?: () => Promise<boolean>) => Promise<void>;
  unlock: () => void;
  lock: () => void;
  touch: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "unknown",
  lastActiveAt: 0,
  evaluate: async (hasWallet, hasPin) => {
    try {
      if (!(await hasWallet())) {
        set({ status: "noWallet" });
        return;
      }
      // A wallet with no app PIN must set one before it can be locked/unlocked (knowledge factor).
      if (hasPin && !(await hasPin())) {
        set({ status: "needsPinSetup" });
        return;
      }
      set({ status: "locked" });
    } catch {
      set({ status: "locked" });
    }
  },
  unlock: () => set({ status: "unlocked", lastActiveAt: Date.now() }),
  lock: () => set({ status: "locked" }),
  touch: () => set({ lastActiveAt: Date.now() }),
}));
