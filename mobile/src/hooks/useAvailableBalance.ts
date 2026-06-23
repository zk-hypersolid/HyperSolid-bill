import { useEffect, useState } from "react";
import type { PositionsService } from "../services/positionsData";
import { isValidAddress } from "./useViewOnlyPortfolio";

/** Connected wallet's withdrawable USDC (for percent sizing). Null until known / when address invalid. */
export function useAvailableBalance(service: PositionsService, address: string | null): number | null {
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    if (!address || !isValidAddress(address)) {
      setBalance(null);
      return;
    }
    let active = true;
    service
      .loadPortfolio(address)
      .then((p) => active && setBalance(p.summary.withdrawable))
      .catch(() => active && setBalance(null));
    return () => {
      active = false;
    };
  }, [service, address]);
  return balance;
}
