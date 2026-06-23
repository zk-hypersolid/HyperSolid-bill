export interface RiskInput {
  notionalUsdc: number;
  killSwitch: boolean;
}
export interface RiskLimits {
  maxNotionalUsdc: number;
}

/** Per-order risk gate: blocked entirely by the kill-switch, else capped by per-order notional. */
export function withinCaps(input: RiskInput, limits: RiskLimits): { ok: boolean; reason?: string } {
  if (input.killSwitch) return { ok: false, reason: "kill-switch active" };
  if (input.notionalUsdc > limits.maxNotionalUsdc) {
    return { ok: false, reason: "over per-order notional cap" };
  }
  return { ok: true };
}
