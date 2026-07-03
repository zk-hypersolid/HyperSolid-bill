/**
 * PII scrubbing for Sentry (hard red line: wallet key material must never leave the device).
 * Pure + SDK-independent so it is unit-tested without Sentry. Applied via Sentry's `beforeSend`.
 */

/** Keys whose values are secret and must be dropped entirely (case-insensitive substring match). */
const SECRET_KEYS = ["privatekey", "private_key", "mnemonic", "seed", "signature", "sig", "pin"];
/** Keys whose values are wallet addresses and should be redacted rather than dropped. */
const ADDRESS_KEYS = ["address", "account", "owner", "destination"];

export function redactAddress(v: string): string {
  return /^0x[0-9a-fA-F]{6,}$/.test(v) ? `${v.slice(0, 6)}…${v.slice(-4)}` : v;
}

function scrubRecord(rec: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(rec)) {
    const key = k.toLowerCase();
    if (SECRET_KEYS.some((s) => key.includes(s))) continue; // drop secrets
    if (typeof val === "string" && ADDRESS_KEYS.some((a) => key.includes(a))) {
      out[k] = redactAddress(val);
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      out[k] = scrubRecord(val as Record<string, unknown>);
    } else {
      out[k] = val;
    }
  }
  return out;
}

/** Scrub a Sentry event's `extra`/`contexts`/`tags` in place-safe fashion. Returns the same shape. */
export function scrubEvent<T>(event: T): T {
  if (!event || typeof event !== "object") return event;
  const e = event as Record<string, unknown>;
  const clone: Record<string, unknown> = { ...e };
  for (const field of ["extra", "contexts", "tags"]) {
    const v = clone[field];
    if (v && typeof v === "object" && !Array.isArray(v)) clone[field] = scrubRecord(v as Record<string, unknown>);
  }
  return clone as T;
}

/** Scrub a breadcrumb's `data` bag with the same rules. */
export function scrubBreadcrumb<T extends { data?: Record<string, unknown> }>(bc: T): T {
  if (bc?.data) return { ...bc, data: scrubRecord(bc.data) };
  return bc;
}
