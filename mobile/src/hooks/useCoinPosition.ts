import { useEffect, useState } from "react";
import type { PositionsService } from "../services/positionsData";
import type { Position } from "../lib/hyperliquid/types";
import { isValidAddress } from "./useViewOnlyPortfolio";

/** Connected wallet's open position for `coin` (or null if flat / unknown), for the Trade ticket context. */
export function useCoinPosition(
  service: PositionsService,
  address: string | null,
  coin: string,
): Position | null {
  const [position, setPosition] = useState<Position | null>(null);
  useEffect(() => {
    if (!address || !isValidAddress(address)) {
      setPosition(null);
      return;
    }
    let active = true;
    service
      .loadPortfolio(address)
      .then((p) => {
        if (!active) return;
        const upper = coin.toUpperCase();
        setPosition(p.positions.find((pos) => pos.coin.toUpperCase() === upper) ?? null);
      })
      .catch(() => active && setPosition(null));
    return () => {
      active = false;
    };
  }, [service, address, coin]);
  return position;
}
