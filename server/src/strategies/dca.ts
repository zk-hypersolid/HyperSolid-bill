export interface DcaParams {
  coin: string;
  side: "buy";
  quoteAmountUsdc: number;
  intervalHours: number;
  maxTotalUsdc?: number;
}

export interface DcaStrategy {
  id: string;
  owner: string;
  status: "running" | "paused";
  params: DcaParams;
  nextRunAt: number;
  filledTotalUsdc: number;
}

/** Running strategies whose next run is due and that haven't hit their optional total cap. */
export function dueStrategies(list: DcaStrategy[], now: number): DcaStrategy[] {
  return list.filter(
    (s) =>
      s.status === "running" &&
      s.nextRunAt <= now &&
      (s.params.maxTotalUsdc === undefined || s.filledTotalUsdc < s.params.maxTotalUsdc),
  );
}

/** The next run timestamp = now + interval. */
export function nextRunAt(s: DcaStrategy, now: number): number {
  return now + s.params.intervalHours * 3600 * 1000;
}

/** Coin size for a quote-USDC buy at `price`. */
export function dcaOrderSize(quoteUsdc: number, price: number): number {
  return price > 0 ? quoteUsdc / price : 0;
}
