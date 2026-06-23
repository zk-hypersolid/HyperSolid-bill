/**
 * Pure Hyperliquid price/size formatting rules (perp). Ported from the app's order module so the
 * server can size DCA child orders the same way: ≤5 significant figures and ≤(6 − szDecimals)
 * price decimals, sizes rounded to szDecimals. Signing/encoding stays inside the HL client.
 */
const PERP_MAX_DECIMALS = 6;
const MAX_SIG_FIGS = 5;

export function roundSize(size: number, szDecimals: number): number {
  const f = 10 ** szDecimals;
  return Math.round(size * f) / f;
}

export function stripTrailingZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

export function formatPrice(price: number, szDecimals: number): string {
  if (Number.isInteger(price)) return String(price);
  const maxDecimals = Math.max(0, PERP_MAX_DECIMALS - szDecimals);
  const sig = Number(price.toPrecision(MAX_SIG_FIGS));
  return stripTrailingZeros(sig.toFixed(maxDecimals));
}
