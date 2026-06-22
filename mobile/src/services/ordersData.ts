import type { OpenOrder, OrdersInfoLike } from "../lib/hyperliquid/types";
import { normalizeOpenOrders } from "../lib/hyperliquid/history";

export class OrdersService {
  constructor(private info: OrdersInfoLike) {}

  /** Current open orders for an address, normalized (deduped by oid). */
  async loadOpenOrders(address: string): Promise<OpenOrder[]> {
    return normalizeOpenOrders(await this.info.openOrders(address));
  }
}
