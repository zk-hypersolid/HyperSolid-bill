import * as Sentry from "@sentry/react-native";
import { scrubEvent, scrubBreadcrumb } from "./sentryScrub";
import type { Breadcrumb } from "./breadcrumb";

export interface SentryEnv {
  dsn: string;
  isDev: boolean;
  isExpoGo: boolean;
}

/** Enable Sentry only in a real (non-Expo-Go) release build that has a DSN. */
export function shouldEnableSentry(env: SentryEnv): boolean {
  return !!env.dsn && !env.isDev && !env.isExpoGo;
}

/** Cold-start init. No-op unless enabled; wires the PII scrubber as beforeSend. */
export function initSentry(env: SentryEnv): void {
  if (!shouldEnableSentry(env)) return;
  Sentry.init({
    dsn: env.dsn,
    beforeSend: (event: unknown) => scrubEvent(event),
    beforeBreadcrumb: (bc: { data?: Record<string, unknown> }) => scrubBreadcrumb(bc),
  } as Parameters<typeof Sentry.init>[0]);
}

/** Production breadcrumb sink (scrubbed) — inject where the app uses `noopBreadcrumb`. */
export const sentryBreadcrumb: Breadcrumb = (event, data) => {
  const bc = scrubBreadcrumb({ message: event, data: data ?? {} });
  Sentry.addBreadcrumb(bc);
};
