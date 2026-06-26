import type { Orderbook } from "./types";
import type { OrderSide } from "./buildOrder";

/** BBO price modes: counterparty (cross the spread) or queue (join your own side), level 1 or 5. */
export type BboMode = "opp1" | "opp5" | "queue1" | "queue5";

/**
 * Resolve the limit price for a BBO mode given the side, using the live book. "Counterparty" means
 * the opposite side's level (a buy lifts the ask, a sell hits the bid); "queue" means your own side.
 * Level 1 = best, level 5 = the 5th level (clamped to the available depth). Returns 0 if the relevant
 * side is empty.
 */
export function bboPrice(book: Orderbook, mode: BboMode, side: OrderSide): number {
  const isOpp = mode.startsWith("opp");
  const level = mode.endsWith("5") ? 5 : 1;
  // buy+opp → ask, buy+queue → bid, sell+opp → bid, sell+queue → ask
  const useAsk = (side === "buy") === isOpp;
  const levels = useAsk ? book.asks : book.bids;
  if (levels.length === 0) return 0;
  const idx = Math.min(level - 1, levels.length - 1);
  return levels[idx].px;
}
