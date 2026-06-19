import { useEffect } from "react";
import type { MarketDataService } from "../services/marketData";
import { useMarketStore } from "../state/marketStore";
import type { Subscription } from "../lib/hyperliquid/types";

export function useLiveMarkets(service: MarketDataService) {
  useEffect(() => {
    let sub: Subscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const tickers = await service.loadSnapshot();
        if (cancelled) return;
        useMarketStore.getState().setMarkets(tickers);
        sub = await service.subscribeMids((mids) => {
          useMarketStore.getState().mergeMids(mids);
        });
      } catch (e) {
        if (!cancelled) {
          useMarketStore.getState().setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
      sub?.unsubscribe().catch(() => {});
    };
  }, [service]);
}
