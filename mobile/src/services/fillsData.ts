import type { Fill, FillsInfoLike } from "../lib/hyperliquid/types";
import { normalizeFills } from "../lib/hyperliquid/history";

export class FillsService {
  constructor(private info: FillsInfoLike) {}

  /** Most recent fills, normalized (deduped by tid, newest first). */
  async loadRecent(address: string): Promise<Fill[]> {
    return normalizeFills(await this.info.userFills(address));
  }

  /** Older fills before `beforeMs` (pagination via userFillsByTime). Returns a normalized page. */
  async loadBefore(address: string, beforeMs: number): Promise<Fill[]> {
    return normalizeFills(await this.info.userFillsByTime(address, 0, beforeMs));
  }
}
