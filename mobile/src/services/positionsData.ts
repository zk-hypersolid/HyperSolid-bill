import type {
  PortfolioSnapshot,
  PositionsInfoLike,
  PositionsSubsLike,
  Subscription,
} from "../lib/hyperliquid/types";
import { normalizePortfolio } from "../lib/hyperliquid/positions";

export class PositionsService {
  constructor(
    private info: PositionsInfoLike,
    private subs?: PositionsSubsLike,
  ) {}

  async loadPortfolio(address: string): Promise<PortfolioSnapshot> {
    const raw = await this.info.clearinghouseState(address);
    return normalizePortfolio(raw);
  }

  /**
   * Live portfolio via the clearinghouseState subscription. Each event carries HL's authoritative
   * MARK-based unrealizedPnl / positionValue (§4.5 — mark, never last trade), updated ~3s. It is
   * replace-state, so reconnect snapshots simply re-replace and are never double-counted (§4.6).
   * Transport-level 60s ping/keepalive is the @nktkas WebSocketTransport's responsibility.
   */
  async subscribeLive(
    address: string,
    onUpdate: (portfolio: PortfolioSnapshot) => void,
  ): Promise<Subscription> {
    if (!this.subs) {
      throw new Error("PositionsService: no subscription client injected");
    }
    return this.subs.clearinghouseState(address, (e) => {
      onUpdate(normalizePortfolio(e.clearinghouseState));
    });
  }
}
