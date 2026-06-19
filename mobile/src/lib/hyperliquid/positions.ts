import type {
  PortfolioSnapshot,
  Position,
  RawClearinghouseState,
} from "./types";

export function normalizePortfolio(raw: RawClearinghouseState): PortfolioSnapshot {
  const positions: Position[] = (raw.assetPositions ?? []).map(({ position: p }) => {
    const szi = Number(p.szi);
    return {
      coin: p.coin,
      size: Math.abs(szi),
      side: szi >= 0 ? "long" : "short",
      entryPx: Number(p.entryPx),
      positionValue: Number(p.positionValue),
      unrealizedPnl: Number(p.unrealizedPnl),
      liquidationPx: p.liquidationPx === null ? null : Number(p.liquidationPx),
      marginUsed: Number(p.marginUsed),
      leverage: p.leverage?.value ?? 0,
    };
  });

  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const ms = raw.marginSummary;

  return {
    summary: {
      accountValue: Number(ms?.accountValue ?? 0),
      totalNtlPos: Number(ms?.totalNtlPos ?? 0),
      totalMarginUsed: Number(ms?.totalMarginUsed ?? 0),
      withdrawable: Number(raw.withdrawable ?? 0),
      totalUnrealizedPnl,
    },
    positions,
  };
}
