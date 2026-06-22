import { stripTrailingZeros, type MarketKind } from "./order";

/**
 * Builder fee `f` is in 1/10 bps (f=10 -> 1bp -> 0.01%). Caps (spec §7):
 * perps 0.1% (100 tenth-bps), spot 1% (1000 tenth-bps).
 */
export const BUILDER_FEE_CAP_TENTH_BPS: Record<MarketKind, number> = {
  perp: 100,
  spot: 1000,
};

export function isBuilderFeeWithinCap(feeTenthBps: number, kind: MarketKind): boolean {
  return (
    Number.isInteger(feeTenthBps) &&
    feeTenthBps >= 0 &&
    feeTenthBps <= BUILDER_FEE_CAP_TENTH_BPS[kind]
  );
}

/** Convert builder fee tenth-bps to a stripped percent string (f=10 -> "0.01%"). */
export function tenthBpsToPercent(feeTenthBps: number): `${string}%` {
  const pct = stripTrailingZeros((feeTenthBps / 1000).toFixed(3));
  return `${pct}%` as `${string}%`;
}

/** User-signed approveBuilderFee payload (main wallet signs; @nktkas params shape). */
export interface ApproveBuilderFeeAction {
  maxFeeRate: `${string}%`;
  builder: `0x${string}`;
}

/**
 * Construct the approveBuilderFee payload the main wallet signs during onboarding (spec §7).
 * `maxFeeRate` accepts tenth-bps (number) or an already-formatted percent string ("0.01%").
 */
export function buildApproveBuilderFee(
  builder: `0x${string}`,
  maxFeeRate: number | `${string}%`,
): ApproveBuilderFeeAction {
  const rate = typeof maxFeeRate === "number" ? tenthBpsToPercent(maxFeeRate) : maxFeeRate;
  return { maxFeeRate: rate, builder };
}
