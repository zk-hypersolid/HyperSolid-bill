import type { Orderbook, OrderbookLevel } from "./types";

function regroup(levels: OrderbookLevel[], tick: number, dir: "ceil" | "floor"): OrderbookLevel[] {
  const sizeByBucket = new Map<number, number>();
  for (const l of levels) {
    const bucket = (dir === "ceil" ? Math.ceil(l.px / tick) : Math.floor(l.px / tick)) * tick;
    const px = Math.round(bucket * 1e8) / 1e8;
    sizeByBucket.set(px, (sizeByBucket.get(px) ?? 0) + l.sz);
  }
  const ordered = [...sizeByBucket.entries()].sort((a, b) => (dir === "ceil" ? a[0] - b[0] : b[0] - a[0]));
  let running = 0;
  return ordered.map(([px, sz]) => {
    running += sz;
    return { px, sz, total: running };
  });
}

/**
 * Re-bucket an order book to a coarser price tick (asks rounded up, bids rounded down), summing
 * sizes and recomputing cumulative totals. `tick <= 0` (or the venue's native tick) returns the
 * book unchanged. Used by the order-book tick-size selector.
 */
export function groupOrderbook(book: Orderbook, tick: number): Orderbook {
  if (!(tick > 0)) return book;
  return {
    bids: regroup(book.bids, tick, "floor"),
    asks: regroup(book.asks, tick, "ceil"),
    spread: book.spread,
    spreadPct: book.spreadPct,
  };
}
