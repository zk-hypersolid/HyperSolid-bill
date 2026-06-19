import { create } from "zustand";
import { defaultTheme, type ThemeName } from "../theme/tokens";

interface ThemeState {
  name: ThemeName;
  setTheme: (n: ThemeName) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  name: defaultTheme,
  setTheme: (name) => set({ name }),
}));
