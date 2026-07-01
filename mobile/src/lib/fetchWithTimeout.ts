const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * fetch with an abort-based timeout so a hung request never leaves the UI waiting forever. Mirrors the
 * 10s default the Hyperliquid SDK and viem already use, applied to our own backend calls (app-config,
 * strategy API). On timeout the promise rejects with a "network"-classified error via AbortSignal.
 */
export function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (typeof AbortController === "undefined") return fetchImpl(input, init);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetchImpl(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}
