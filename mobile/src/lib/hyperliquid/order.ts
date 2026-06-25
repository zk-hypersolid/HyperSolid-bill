/**
 * Hyperliquid order correctness "三件套" — pure, signing-independent rules.
 * Refs: gap analysis B1 (tick/lot), B2 (asset-id), B3 ($10 min), B4 (status codes).
 */

const PERP_MAX_DECIMALS = 6;
const SPOT_MAX_DECIMALS = 8;
const MAX_SIG_FIGS = 5;
const MIN_NOTIONAL_USD = 10;

/** Hyperliquid market kind — perp prices allow ≤6 decimals, spot ≤8 (before szDecimals). */
export type MarketKind = "perp" | "spot";

/** Round a size to the asset's szDecimals (lot size). */
export function roundSize(size: number, szDecimals: number): number {
  const f = 10 ** szDecimals;
  return Math.round(size * f) / f;
}

/** Clamp a desired leverage into the asset's allowed range [1, maxLeverage] (HL per-asset cap). */
export function clampLeverage(desired: number, maxLeverage: number): number {
  const max = Math.max(1, Math.floor(maxLeverage || 1));
  if (!Number.isFinite(desired) || desired < 1) return 1;
  return Math.min(Math.floor(desired), max);
}

/**
 * Validate a TP/SL trigger price sits on the correct side of entry (HL rejects otherwise with
 * badTriggerPxRejected). For a long (entry buy): TP must be above entry, SL below; reversed for a
 * short. Returns null when valid, or the rejection code.
 */
export function validateTriggerSide(params: {
  side: "buy" | "sell";
  entryPx: number;
  triggerPx: number;
  tpsl: "tp" | "sl";
}): "badTriggerPxRejected" | "priceRejected" | null {
  const { side, entryPx, triggerPx, tpsl } = params;
  if (!(triggerPx > 0) || !Number.isFinite(triggerPx) || !(entryPx > 0)) return "priceRejected";
  const isLong = side === "buy";
  // long: TP above / SL below entry. short: TP below / SL above entry.
  const mustBeAbove = isLong ? tpsl === "tp" : tpsl === "sl";
  if (mustBeAbove && triggerPx <= entryPx) return "badTriggerPxRejected";
  if (!mustBeAbove && triggerPx >= entryPx) return "badTriggerPxRejected";
  return null;
}

/** Strip trailing zeros from a fixed-decimal string (HL requires this before signing). */
export function stripTrailingZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

/** Max price decimals allowed: (perp 6 / spot 8) − szDecimals, clamped at 0. */
function maxPriceDecimals(szDecimals: number, kind: MarketKind): number {
  const base = kind === "spot" ? SPOT_MAX_DECIMALS : PERP_MAX_DECIMALS;
  return Math.max(0, base - szDecimals);
}

/**
 * Format a price per HL rules (§4.2):
 * - integer prices are always allowed (e.g. 123456),
 * - otherwise ≤ MAX_SIG_FIGS significant figures AND ≤ (perp 6 / spot 8 − szDecimals) decimals.
 * Returns a trailing-zero-stripped string.
 */
export function formatPrice(price: number, szDecimals: number, kind: MarketKind = "perp"): string {
  if (Number.isInteger(price)) return String(price);
  const maxDecimals = maxPriceDecimals(szDecimals, kind);
  // significant-figure rounding
  const sig = Number(price.toPrecision(MAX_SIG_FIGS));
  const fixed = sig.toFixed(maxDecimals);
  return stripTrailingZeros(fixed);
}

export type OrderRejection =
  | "tickRejected"
  | "minTradeNtlRejected"
  | "sizeRejected"
  | "priceRejected";

export interface OrderInput {
  price: number;
  size: number;
  szDecimals: number;
}

/** Validate an order against tick/lot/min-notional. Returns null if valid, else a rejection code. */
export function validateOrder(o: OrderInput): OrderRejection | null {
  if (!(o.price > 0) || !Number.isFinite(o.price)) return "priceRejected";
  if (!(o.size > 0) || !Number.isFinite(o.size)) return "sizeRejected";
  const rounded = roundSize(o.size, o.szDecimals);
  if (rounded <= 0) return "sizeRejected";
  if (rounded * o.price < MIN_NOTIONAL_USD) return "minTradeNtlRejected";
  return null;
}

/** Human-readable Chinese messages for HL rejection codes (gap analysis B4). */
export const REJECTION_MESSAGES: Record<string, string> = {
  tickRejected: "价格不符合最小变动单位（tick）规则",
  minTradeNtlRejected: "订单名义价值低于最小 $10",
  sizeRejected: "数量无效或低于最小下单量",
  priceRejected: "价格无效",
  perpMarginRejected: "保证金不足",
  reduceOnlyRejected: "仅减仓订单不能增加仓位",
  badAloPxRejected: "ALO（只挂单）价格会立即成交",
  badTriggerPxRejected: "触发价位于错误一侧",
  iocCancelRejected: "IOC 订单未成交被取消",
  oracleRejected: "价格偏离预言机过大",
  builderFeeRejected: "Builder 返佣费率超出上限（perps 0.1% / spot 1%）",
  unknownAsset: "未找到该交易对（asset 未知）",
};

/** Chinese messages for HL order lifecycle / cancellation statuses (spec §4.4). */
export const STATUS_MESSAGES: Record<string, string> = {
  open: "订单已挂单",
  filled: "订单已成交",
  canceled: "订单已取消",
  triggered: "触发单已激活",
  rejected: "订单被拒绝",
  marginCanceled: "保证金不足，订单已取消",
  reduceOnlyCanceled: "仅减仓限制，订单已取消",
  siblingFilledCanceled: "配对的 TP/SL 已成交，另一腿已取消",
  scheduledCancel: "计划撤单（dead-man switch）已触发",
  openInterestCapCanceled: "持仓量已达上限，订单已取消",
  liquidatedCanceled: "账户被清算，订单已取消",
};

export function rejectionMessage(code: string): string {
  return REJECTION_MESSAGES[code] ?? `订单被拒绝（${code}）`;
}

export type OrderStatusKind =
  | "resting"
  | "filled"
  | "rejected"
  | "canceled"
  | "waiting"
  | "unknown";

/** Normalized order status (signing-independent) consumed by services/UI. */
export interface NormalizedStatus {
  kind: OrderStatusKind;
  message: string;
  code?: string;
  oid?: number;
  cloid?: string;
  totalSz?: string;
  avgPx?: string;
}

function messageForCode(code: string): string | undefined {
  return REJECTION_MESSAGES[code] ?? STATUS_MESSAGES[code];
}

function kindForCode(code: string): OrderStatusKind {
  if (code.endsWith("Rejected")) return "rejected";
  if (code.endsWith("Canceled") || code === "canceled" || code === "scheduledCancel") {
    return "canceled";
  }
  if (code === "filled") return "filled";
  if (code === "open" || code === "resting" || code === "triggered") return "resting";
  return "unknown";
}

/** Find a known rejection code embedded in an HL error string (codes or known English phrases). */
function rejectionCodeFromError(error: string): string | null {
  const lower = error.toLowerCase();
  for (const code of Object.keys(REJECTION_MESSAGES)) {
    if (lower.includes(code.toLowerCase())) return code;
  }
  if (lower.includes("minimum value")) return "minTradeNtlRejected";
  return null;
}

/**
 * Normalize a single HL order `status` (from response `statuses[]`, openOrders, or
 * orderUpdates) into `{ kind, message, ... }`. Pure & signing-independent (spec §4.4).
 * Object forms: {resting}, {filled}, {error}, {waitingForFill}, {waitingForTrigger}.
 * String form: a bare lifecycle/rejection code (e.g. "marginCanceled", "tickRejected").
 */
export function normalizeOrderStatus(status: unknown): NormalizedStatus {
  if (typeof status === "string") {
    const msg = messageForCode(status);
    if (msg) return { kind: kindForCode(status), message: msg, code: status };
    return { kind: "unknown", message: `未知订单状态（${status}）`, code: status };
  }
  if (status && typeof status === "object") {
    const s = status as Record<string, unknown>;
    const resting = s.resting as { oid?: number; cloid?: string } | undefined;
    if (resting) {
      return { kind: "resting", message: STATUS_MESSAGES.open, oid: resting.oid, cloid: resting.cloid };
    }
    const filled = s.filled as
      | { oid?: number; cloid?: string; totalSz?: string; avgPx?: string }
      | undefined;
    if (filled) {
      return {
        kind: "filled",
        message: STATUS_MESSAGES.filled,
        oid: filled.oid,
        cloid: filled.cloid,
        totalSz: filled.totalSz,
        avgPx: filled.avgPx,
      };
    }
    if (s.waitingForFill) return { kind: "waiting", message: "等待成交" };
    if (s.waitingForTrigger) return { kind: "waiting", message: "等待触发价" };
    if (typeof s.error === "string") {
      const code = rejectionCodeFromError(s.error);
      if (code) return { kind: kindForCode(code), message: messageForCode(code)!, code };
      return { kind: "rejected", message: s.error };
    }
  }
  return { kind: "unknown", message: "未知订单状态" };
}
