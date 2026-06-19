import { themes, type ThemeTokens } from "./tokens";
import { useThemeStore } from "../state/themeStore";

export function useTheme(): ThemeTokens {
  const name = useThemeStore((s) => s.name);
  return themes[name];
}
