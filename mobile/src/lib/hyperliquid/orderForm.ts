/**
 * Pure helpers for the order-ticket form (signing-independent). Maps the Hyperliquid order-type
 * menu (Market / Limit / Stop Limit / Stop Market / Take-Profit Limit / Take-Profit Market) to the
 * encoder's trigger/limit shape, plus quote↔base sizing, required margin and venue fee rates.
 */

export type TicketOrderType =
  | "market"
  | "limit"
  | "stopLimit"
  | "stopMarket"
  | "tpLimit"
  | "tpMarket";

export interface OrderTypeShape {
  /** A trigger (stop / take-profit) order rather than a plain market or limit order. */
  isTrigger: boolean;
  /** When triggered, fills at market (true) or rests as a limit at the order price (false). */
  triggerIsMarket: boolean;
  /** Whether the user supplies a limit price (market & *-Market types don't). */
  usesLimitPrice: boolean;
  /** Trigger direction (ignored for market/limit). */
  tpsl: "tp" | "sl";
}

export function orderTypeShape(type: TicketOrderType): OrderTypeShape {
  switch (type) {
    case "market":
      return { isTrigger: false, triggerIsMarket: false, usesLimitPrice: false, tpsl: "sl" };
    case "limit":
      return { isTrigger: false, triggerIsMarket: false, usesLimitPrice: true, tpsl: "sl" };
    case "stopLimit":
      return { isTrigger: true, triggerIsMarket: false, usesLimitPrice: true, tpsl: "sl" };
    case "stopMarket":
      return { isTrigger: true, triggerIsMarket: true, usesLimitPrice: false, tpsl: "sl" };
    case "tpLimit":
      return { isTrigger: true, triggerIsMarket: false, usesLimitPrice: true, tpsl: "tp" };
    case "tpMarket":
      return { isTrigger: true, triggerIsMarket: true, usesLimitPrice: false, tpsl: "tp" };
  }
}

/** HL base-tier perp fees (taker / maker) as fractions of notional. */
export const TAKER_FEE_RATE = 0.00045;
export const MAKER_FEE_RATE = 0.00015;

export type SizeUnit = "base" | "quote";

/** Convert a size typed in base (coin) or quote (USDC) units to a base-coin size. */
export function toBaseSize(unit: SizeUnit, value: number, price: number): number {
  if (!(value > 0)) return 0;
  if (unit === "quote") return price > 0 ? value / price : 0;
  return value;
}

/** Initial margin required to open a position: notional / leverage. */
export function requiredMargin(notional: number, leverage: number): number {
  return leverage > 0 ? notional / leverage : 0;
}
