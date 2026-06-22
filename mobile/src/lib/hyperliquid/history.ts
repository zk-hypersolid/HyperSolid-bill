import type {
  Fill,
  FundingEvent,
  OpenOrder,
  RawFunding,
  RawOpenOrder,
  RawUserFill,
} from "./types";

/** HL order side encoding: "B" = bid/buy, "A" = ask/sell. */
function sideFromBA(side: "B" | "A"): "buy" | "sell" {
  return side === "B" ? "buy" : "sell";
}

/** Normalize userFills, de-duplicating by `tid` (partial-fill id), newest first. */
export function normalizeFills(raw: RawUserFill[]): Fill[] {
  const seen = new Set<number>();
  const out: Fill[] = [];
  for (const f of raw) {
    if (seen.has(f.tid)) continue;
    seen.add(f.tid);
    out.push({
      coin: f.coin,
      px: Number(f.px),
      sz: Number(f.sz),
      side: sideFromBA(f.side),
      time: f.time,
      closedPnl: Number(f.closedPnl),
      dir: f.dir,
      fee: Number(f.fee),
      builderFee: f.builderFee !== undefined ? Number(f.builderFee) : 0,
      feeToken: f.feeToken,
      oid: f.oid,
      tid: f.tid,
      hash: f.hash,
      crossed: f.crossed,
    });
  }
  return out.sort((a, b) => b.time - a.time);
}

/** Normalize userFundings (flatten the `delta`), newest first. usdc is signed (negative = paid). */
export function normalizeFundings(raw: RawFunding[]): FundingEvent[] {
  return raw
    .map((r) => ({
      coin: r.delta.coin,
      time: r.time,
      usdc: Number(r.delta.usdc),
      szi: Number(r.delta.szi),
      fundingRate: Number(r.delta.fundingRate),
      hash: r.hash,
    }))
    .sort((a, b) => b.time - a.time);
}

/** Normalize openOrders, de-duplicating by `oid`. */
export function normalizeOpenOrders(raw: RawOpenOrder[]): OpenOrder[] {
  const seen = new Set<number>();
  const out: OpenOrder[] = [];
  for (const o of raw) {
    if (seen.has(o.oid)) continue;
    seen.add(o.oid);
    out.push({
      coin: o.coin,
      side: sideFromBA(o.side),
      limitPx: Number(o.limitPx),
      sz: Number(o.sz),
      origSz: Number(o.origSz),
      oid: o.oid,
      timestamp: o.timestamp,
      cloid: o.cloid ?? null,
      reduceOnly: o.reduceOnly === true,
    });
  }
  return out;
}
