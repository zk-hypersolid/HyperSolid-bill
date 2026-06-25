# Wallet Lock — App PIN + optional biometric + seed recovery (Design)

**Date:** 2026-06-25
**Status:** approved approach (user picked the industry-standard model), detailed design.
**Supersedes the lock part of ADR-011's "biometric-only" gate.**

## Problem

The session lock was biometric-only with `disableDeviceFallback: true` and no knowledge factor. With the new SecureStore non-auth fallback, a wallet can be created without biometrics and then never unlocked. Industry wallets (MetaMask, Trust) never rely on biometrics alone: an **app PIN/password** is the primary gate, biometric is an optional convenience, and the **seed phrase** is the ultimate recovery — no permanent lockout.

## Model (three layers)

1. **App PIN (primary, knowledge factor):** a 6-digit PIN set during onboarding. Verifies app access; the fallback whenever biometric fails/unavailable.
2. **Biometric (optional convenience):** a settings toggle "Unlock with Face ID". When enabled + available, unlock with biometrics; on fail/unavailable → fall back to PIN entry. `disableDeviceFallback: true` stays (no OS-passcode fallback for the biometric prompt — the *app PIN* is the fallback).
3. **Seed phrase (ultimate recovery):** the existing "Can't unlock? Restore from recovery phrase" escape stays as the final safety net. RASP (device-integrity) remains a hard gate above everything.

## Security design

- **PIN storage:** never store the PIN. Store a PBKDF2-SHA256 verifier `{ salt, iterations, hashHex }` (random 16-byte salt, ≥100k iterations) in a **non-auth, device-bound** SecureStore item (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Verify by re-deriving and constant-time comparing.
- **At-rest protection of the mnemonic is unchanged** — it stays in the device-bound keychain (biometric-ACL when available, per `SecureStoreKeyStore`). The PIN gates *app access* (the realistic threat: an unlocked phone in someone else's hands); RASP + keychain protect at rest. (6-digit entropy is too low to be the sole at-rest protection, so we do NOT rely on PIN-encryption of the mnemonic.)
- **Attempt limiting:** count consecutive failures in the device-bound store; after **MAX_ATTEMPTS (10)** the PIN unlock is disabled and the user must use the seed-restore recovery (we never silently wipe). Counter resets on success.
- **Crypto:** `@noble/hashes` (pbkdf2 + sha256 + randomBytes) — pure JS, RN-compatible, already transitive via viem; added as a direct dep.

## Units (each TDD'd + committed)

1. **`src/wallet/pin.ts`** — pure crypto: `derivePinVerifier(pin, salt?, iterations?)` → `{salt, iterations, hashHex}`, `verifyPin(pin, verifier)` (constant-time). No I/O.
2. **`src/wallet/pinStore.ts`** — `PinStore` over SecureStore (device-bound, non-auth): `setPin`, `verify(pin)` → result incl. remaining attempts / locked-out, `hasPin`, `clear`. Owns the attempt counter.
3. **`src/state/lockPrefsStore.ts`** — in-memory `biometricEnabled` toggle (mirrors other stores; persisted later if needed) + the unlock-mode selection.
4. **Auth flow** — extend `authStore` status to include a `pinEntry` step / or LockScreen handles PIN inline. `unlockSession` gains: biometric (if enabled+available) → else/also PIN verify → load wallet. `recoverFromLock` unchanged + also clears the PIN.
5. **UI** — `PinPad` (6-digit), PIN **setup** (enter twice) shown after create/restore, PIN **entry** on the lock screen as the biometric fallback. Biometric toggle row in `AccountScreen` ("Security & Face ID").
6. **Onboarding wiring** — after create/restore → set PIN → optionally enable biometric.

## Interim already shipped

The "degrade when biometrics unavailable + seed-restore escape" fix (commit 4cdf382) prevents lockout TODAY. Once the PIN ships, tighten the "auto-unlock when no biometric" path to "require PIN" (closes the no-knowledge-factor hole).

## Testing

Pure `pin.ts` (derive/verify, wrong PIN, salt independence); `pinStore` (set/verify/attempt-lockout/clear) with a mocked SecureStore; flow tests for biometric→PIN fallback and PIN→unlock; UI tests for PinPad + setup + lock entry + biometric toggle. en/zh i18n throughout.

## Out of scope (later)

- Persisting `biometricEnabled` across restart (in-memory for now, like theme/locale).
- Password (vs 6-digit PIN) for higher entropy; biometric-cached vault encryption.
- Change-PIN flow in settings (add after the core ships).
