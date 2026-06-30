import { useState, useCallback } from "react";
import type { PositionsService } from "../services/positionsData";
import type { PortfolioSnapshot } from "../lib/hyperliquid/types";
import { classifyFetchError } from "../lib/errorMessage";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** Stable, user-safe load-error codes; screens translate these to localized copy + a retry. */
export type PortfolioErrorCode = "invalidAddress" | "network" | "unknown";

export function isValidAddress(addr: string): boolean {
  return ADDRESS_RE.test(addr.trim());
}

export function useViewOnlyPortfolio(service: PositionsService) {
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PortfolioErrorCode | null>(null);

  const load = useCallback(
    async (address: string) => {
      const addr = address.trim();
      if (!isValidAddress(addr)) {
        setError("invalidAddress");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        setPortfolio(await service.loadPortfolio(addr));
      } catch (e) {
        // Never leak the raw SDK string (e.g. "Unknown HTTP request error: ...") to the UI.
        setError(classifyFetchError(e));
      } finally {
        setLoading(false);
      }
    },
    [service],
  );

  return { portfolio, loading, error, load };
}
