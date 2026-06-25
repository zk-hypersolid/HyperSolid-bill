import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes, bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

/** Salted PBKDF2-SHA256 verifier for an app PIN. The PIN itself is never stored. */
export interface PinVerifier {
  /** Random salt, hex (16 bytes / 32 hex chars). */
  salt: string;
  /** PBKDF2 iteration count. */
  iterations: number;
  /** Derived key, hex (32 bytes / 64 hex chars). */
  hashHex: string;
}

const DEFAULT_ITERATIONS = 100000;
const DK_LEN = 32;
const enc = new TextEncoder();

function derive(pin: string, salt: Uint8Array, iterations: number): string {
  return bytesToHex(pbkdf2(sha256, enc.encode(pin), salt, { c: iterations, dkLen: DK_LEN }));
}

/** Derive a PIN verifier with a fresh random salt (or a provided salt, for tests). */
export function derivePinVerifier(
  pin: string,
  saltHex?: string,
  iterations: number = DEFAULT_ITERATIONS,
): PinVerifier {
  const salt = saltHex ? hexToBytes(saltHex) : randomBytes(16);
  return { salt: bytesToHex(salt), iterations, hashHex: derive(pin, salt, iterations) };
}

/** Constant-time-ish check of a PIN against a stored verifier. */
export function verifyPin(pin: string, v: PinVerifier): boolean {
  const candidate = derive(pin, hexToBytes(v.salt), v.iterations);
  if (candidate.length !== v.hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ v.hashHex.charCodeAt(i);
  return diff === 0;
}
