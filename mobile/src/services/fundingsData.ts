import type { FundingEvent, FundingsInfoLike } from "../lib/hyperliquid/types";
import { normalizeFundings } from "../lib/hyperliquid/history";

export class FundingsService {
  constructor(private info: FundingsInfoLike) {}

  /** Funding events from `startTime` (default 0 = all), normalized newest-first. */
  async load(address: string, startTime = 0, endTime?: number): Promise<FundingEvent[]> {
    return normalizeFundings(await this.info.userFunding(address, startTime, endTime));
  }
}
