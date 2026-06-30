/**
 * Classify a thrown fetch/SDK error into a stable, user-safe code so screens can show a friendly,
 * localized message + a retry — instead of leaking the raw @nktkas/hyperliquid string (e.g.
 * "Unknown HTTP request error: ...", `HttpRequestError`) or a bare `TypeError: Network request failed`.
 */
export type FetchErrorCode = "network" | "unknown";

export function classifyFetchError(e: unknown): FetchErrorCode {
  const name = e instanceof Error ? e.name : "";
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (
    name === "HttpRequestError" ||
    name === "TransportError" ||
    name === "WebSocketRequestError" ||
    msg.includes("unknown http request error") ||
    msg.includes("network request failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("timed out")
  ) {
    return "network";
  }
  return "unknown";
}
