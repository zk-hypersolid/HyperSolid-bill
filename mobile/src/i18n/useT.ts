import { useLocaleStore } from "../state/localeStore";
import { messages, type TranslationKey } from "./messages";

export type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

/**
 * Translation hook. Returns `t(key, params?)` bound to the active locale: looks up
 * `messages[locale][key]`, interpolates `{var}` placeholders, and falls back to the raw key if a
 * translation is ever missing (so the UI degrades to a visible key instead of crashing).
 */
export function useT(): Translate {
  const locale = useLocaleStore((s) => s.locale);
  return (key, params) => {
    const template: string = messages[locale][key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, name: string) =>
      name in params ? String(params[name]) : `{${name}}`,
    );
  };
}
