import type { TpslParams } from "./types";

/** True when `mark` has crossed a configured tp/sl for a position of sign `szi` (>0 long, <0 short). */
export function tpslTriggered(p: TpslParams, szi: number, mark: number): boolean {
  if (szi > 0) {
    if (p.takeProfitPrice !== undefined && mark >= p.takeProfitPrice) return true;
    if (p.stopLossPrice !== undefined && mark <= p.stopLossPrice) return true;
  } else if (szi < 0) {
    if (p.takeProfitPrice !== undefined && mark <= p.takeProfitPrice) return true;
    if (p.stopLossPrice !== undefined && mark >= p.stopLossPrice) return true;
  }
  return false;
}

/** The reduce-only close side for a position: long closes with a sell, short with a buy. */
export function closeSide(szi: number): "buy" | "sell" {
  return szi > 0 ? "sell" : "buy";
}
