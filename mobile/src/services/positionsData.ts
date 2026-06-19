import type { PortfolioSnapshot, PositionsInfoLike } from "../lib/hyperliquid/types";
import { normalizePortfolio } from "../lib/hyperliquid/positions";

export class PositionsService {
  constructor(private info: PositionsInfoLike) {}

  async loadPortfolio(address: string): Promise<PortfolioSnapshot> {
    const raw = await this.info.clearinghouseState(address);
    return normalizePortfolio(raw);
  }
}
