# Wallet Export & Backup — Design (Iteration C: key management)

**Date:** 2026-06-24
**Scope:** Close the v8 Wallet "Export & backup" gap — let a user with a connected **local** wallet re-reveal their existing recovery phrase (mnemonic) for backup, gated by the OS biometric prompt. Polish of private-key management; no change to signing or to the security model.

## Problem

The recovery phrase is shown **once** at wallet creation (`AccountScreen` `newMnemonic` card) and never again. A user who skipped or lost that backup has no in-app path to recover it, even though the mnemonic is safely persisted (biometric-gated `expo-secure-store`). v8's Wallet screen lists an "Export & backup" row; we never implemented it (correctly avoiding a fake/non-functional row).

## Approach

Reuse the existing biometric gate and reveal UI — add the smallest possible surface:

1. **`WalletManager.exportMnemonic(): Promise<string | null>`** — a new, purely-additive method that returns `this.store.loadMnemonic()`. On device, `SecureStoreKeyStore.loadMnemonic` reads with `requireAuthentication: true`, so the OS shows the biometric prompt automatically; a cancel/fail rejects. This **reuses the core** (permitted carve-out) and changes no existing security logic.
2. **`AccountScreen`** — make the `WalletManager` injectable via `AccountScreenDeps.manager` (defaults to the real `new WalletManager(new SecureStoreKeyStore())`), so the export flow is unit-testable with a fake manager, mirroring the existing `positions`/`fundings` DI.
3. **"Export & backup" settings row** (rendered only for `mode === "local"`): on press → `await manager.exportMnemonic()`. On success, reveal the phrase in the **existing** `newMnemonic` warning card (same "never screenshot" warning + "I've backed it up safely" dismiss that clears it). On null/throw (no wallet, or biometric cancel/fail), show a translated `Alert`.

## Why this is safe

- **No new key storage, no weakened protections.** The phrase is read from the same hardware-backed, auth-gated item; nothing is copied to disk, logs, or a non-auth store.
- **Fresh biometric auth per export.** The in-memory `LocalWalletService` only holds the derived viem account, not the mnemonic string, so export must re-read `SecureStore` → re-prompts biometrics every time.
- **Same on-screen exposure as the accepted create-time flow**, dismiss clears React state.
- **Guarded layer untouched** except one additive method that delegates to the existing gated read.

## i18n (en / zh, per the established `messages.ts` + `useT` convention)

- `account.exportBackup` — "Export & backup" / "导出与备份"
- `account.exportFailed` — "Export failed" / "导出失败" (Alert title)
- `account.exportFailedBody` — "Biometric authentication is required to reveal your recovery phrase." / "需要生物识别验证才能显示助记词。"

## Testing

- `walletManager.test.ts`: `exportMnemonic` returns the persisted mnemonic after create/restore, and `null` when no wallet.
- `AccountScreen.test.tsx`: with `mode: "local"` + injected fake manager, pressing "Export & backup" reveals the phrase via the warning card; a rejecting manager surfaces the failure Alert and reveals nothing.

## Out of scope (noted for later)

- "Security & Face ID" toggle and "Manage wallet" rows (a real biometric toggle changes the gating model — needs its own design).
- Two hardcoded-Chinese strings in the guarded wallet layer (`sessionController.ts` `UNLOCK_REASON`, `biometricGate.ts` `cancelLabel`) — i18n leaks to fix when the guarded layer is next intentionally revised.
- Private-key (hex) export — mnemonic is the canonical root backup; hex export adds exposure surface without clear demand.
