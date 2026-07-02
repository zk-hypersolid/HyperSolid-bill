import type { StrategyKind, StrategyParams, DcaParams, TwapParams, TpslParams } from "./types";

type Result = { ok: true; params: StrategyParams } | { ok: false; error: string };

function positiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function positiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

export function validateParams(kind: StrategyKind, params: unknown): Result {
  const p = (params ?? {}) as Record<string, unknown>;
  const coin = p.coin;
  if (typeof coin !== "string" || coin.length === 0) return { ok: false, error: "coin required" };

  if (kind === "dca") {
    const d = p as unknown as DcaParams;
    if (d.side !== "buy") return { ok: false, error: "dca side must be buy" };
    if (!positiveNumber(d.quoteAmountUsdc)) return { ok: false, error: "quoteAmountUsdc must be > 0" };
    if (!positiveNumber(d.intervalHours)) return { ok: false, error: "intervalHours must be > 0" };
    if (d.maxTotalUsdc !== undefined && !positiveNumber(d.maxTotalUsdc)) return { ok: false, error: "maxTotalUsdc must be > 0" };
    return { ok: true, params: { coin, side: "buy", quoteAmountUsdc: d.quoteAmountUsdc, intervalHours: d.intervalHours, ...(d.maxTotalUsdc !== undefined ? { maxTotalUsdc: d.maxTotalUsdc } : {}) } };
  }
  if (kind === "twap") {
    const t = p as unknown as TwapParams;
    if (t.side !== "buy" && t.side !== "sell") return { ok: false, error: "twap side must be buy or sell" };
    if (!positiveNumber(t.totalUsdc)) return { ok: false, error: "totalUsdc must be > 0" };
    if (!positiveInteger(t.slices)) return { ok: false, error: "slices must be a positive integer" };
    if (!positiveNumber(t.durationHours)) return { ok: false, error: "durationHours must be > 0" };
    return { ok: true, params: { coin, side: t.side, totalUsdc: t.totalUsdc, slices: t.slices, durationHours: t.durationHours } };
  }
  if (kind === "tpsl") {
    const x = p as unknown as TpslParams;
    const hasTp = x.takeProfitPrice !== undefined;
    const hasSl = x.stopLossPrice !== undefined;
    if (!hasTp && !hasSl) return { ok: false, error: "takeProfitPrice or stopLossPrice required" };
    if (hasTp && !positiveNumber(x.takeProfitPrice)) return { ok: false, error: "takeProfitPrice must be > 0" };
    if (hasSl && !positiveNumber(x.stopLossPrice)) return { ok: false, error: "stopLossPrice must be > 0" };
    return { ok: true, params: { coin, ...(hasTp ? { takeProfitPrice: x.takeProfitPrice } : {}), ...(hasSl ? { stopLossPrice: x.stopLossPrice } : {}) } };
  }
  return { ok: false, error: "unknown strategy kind" };
}
