import { create } from "zustand";
import type { Locale } from "../i18n/messages";

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
}

/**
 * Active UI language. Defaults to `en` (the v8 design copy). In-memory, mirroring `themeStore`/
 * `envStore` (persistence is a trivial later add).
 */
export const useLocaleStore = create<LocaleState>((set) => ({
  locale: "en",
  setLocale: (locale) => set({ locale }),
  toggleLocale: () => set((s) => ({ locale: s.locale === "en" ? "zh" : "en" })),
}));
