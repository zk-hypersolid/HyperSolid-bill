/** Time left until the next hourly funding settlement (UTC), as HH:MM:SS. */
export function fundingCountdown(nowMs: number): string {
  const ms = 3_600_000 - (nowMs % 3_600_000);
  const total = Math.floor(ms / 1000);
  const p = (x: number) => x.toString().padStart(2, "0");
  return `${p(Math.floor(total / 3600))}:${p(Math.floor((total % 3600) / 60))}:${p(total % 60)}`;
}
