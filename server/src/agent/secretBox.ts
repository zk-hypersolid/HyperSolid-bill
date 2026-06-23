import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "v1";
// Fixed salt: the input secret is already high-entropy server config; scrypt here just widens it to
// 32 bytes deterministically. Per-record randomness comes from the IV, not the salt.
const SALT = "hypersolid.agent.secretbox.v1";

/** Derive a 32-byte AES key from a server secret (env). Deterministic so restarts can decrypt. */
export function deriveKey(secret: string): Buffer {
  return scryptSync(secret, SALT, 32);
}

/**
 * Authenticated-encrypt a secret (e.g. an agent private key) for at-rest storage. Format:
 * `v1.<iv>.<tag>.<ciphertext>` (base64url). A random 12-byte IV per call means identical plaintexts
 * yield different blobs; GCM's tag makes tampering or a wrong key fail loudly on open.
 */
export function seal(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

/** Decrypt a blob produced by `seal`. Throws if the key is wrong or the blob was tampered with. */
export function open(blob: string, key: Buffer): string {
  const [prefix, ivB64, tagB64, ctB64] = blob.split(".");
  if (prefix !== PREFIX || !ivB64 || !tagB64 || !ctB64) throw new Error("bad sealed blob");
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64url")), decipher.final()]).toString("utf8");
}
