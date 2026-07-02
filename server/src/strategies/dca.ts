import type { Strategy, DcaParams } from "./types";
export type { DcaParams } from "./types";

/** Running DCA strategies whose next run is due and that haven't hit their optional total cap. */
export function dueDca(list: Strategy[], now: number): Strategy[] {
  return list.filter(
    (s) =>
      s.kind === "dca" &&
      s.status === "running" &&
      (s.nextRunAt ?? 0) <= now &&
      (s.params.maxTotalUsdc === undefined || (s.filledTotalUsdc ?? 0) < s.params.maxTotalUsdc),
  );
}

/** The next run timestamp = now + interval. */
export function dcaNextRunAt(params: DcaParams, now: number): number {
  return now + params.intervalHours * 3600 * 1000;
}

/** Coin size for a quote-USDC buy at `price`. */
export function dcaOrderSize(quoteUsdc: number, price: number): number {
  return price > 0 ? quoteUsdc / price : 0;
}
