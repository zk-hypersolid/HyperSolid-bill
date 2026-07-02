/** HL perp metadata (subset): the ordered `universe` whose index is the asset id. */
export interface PerpMeta {
  universe: { name: string; szDecimals: number }[];
}

/** Resolve a coin's perp asset index (position in `universe`) + szDecimals. Throws if unknown. */
export function assetIndexFromMeta(meta: PerpMeta, coin: string): { assetIndex: number; szDecimals: number } {
  const assetIndex = meta.universe.findIndex((u) => u.name === coin);
  if (assetIndex < 0) throw new Error(`unknown coin: ${coin}`);
  return { assetIndex, szDecimals: meta.universe[assetIndex].szDecimals };
}

/** Mid price for a coin from HL `allMids` (name → string price); 0 if absent/unparseable. */
export function priceFromMids(mids: Record<string, string>, coin: string): number {
  const px = Number(mids[coin]);
  return Number.isFinite(px) ? px : 0;
}

/** HL clearinghouse state (subset): open positions with their signed size `szi`. */
export interface ClearinghouseState {
  assetPositions?: { position?: { coin?: string; szi?: string } }[];
}

/** Signed position size for a coin (>0 long, <0 short); 0 if flat/absent/unparseable. */
export function positionSzi(state: ClearinghouseState, coin: string): number {
  const found = state.assetPositions?.find((ap) => ap.position?.coin === coin);
  const szi = Number(found?.position?.szi);
  return Number.isFinite(szi) ? szi : 0;
}
