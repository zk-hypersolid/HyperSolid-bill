import { useState, useCallback } from "react";
import type { PositionsService } from "../services/positionsData";
import type { PortfolioSnapshot } from "../lib/hyperliquid/types";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function isValidAddress(addr: string): boolean {
  return ADDRESS_RE.test(addr.trim());
}

export function useViewOnlyPortfolio(service: PositionsService) {
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (address: string) => {
      const addr = address.trim();
      if (!isValidAddress(addr)) {
        setError("地址格式无效（需 0x + 40 位十六进制）");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        setPortfolio(await service.loadPortfolio(addr));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [service],
  );

  return { portfolio, loading, error, load };
}
