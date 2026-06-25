import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";

interface ToastState {
  message: string | null;
  kind: ToastKind;
  /** Show a transient, non-blocking toast (auto-dismisses; the Toast component owns the timer). */
  show: (message: string, kind?: ToastKind) => void;
  hide: () => void;
}

/**
 * Lightweight global toast for non-blocking success/info feedback (e.g. "Order placed"), so routine
 * confirmations don't interrupt with a modal Alert. Reserve Alert for high-stakes confirmations and
 * hard errors. In-memory, mirroring the app's other zustand stores.
 */
export const useToastStore = create<ToastState>((set) => ({
  message: null,
  kind: "info",
  show: (message, kind = "info") => set({ message, kind }),
  hide: () => set({ message: null }),
}));
