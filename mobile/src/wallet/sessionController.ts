import { useAuthStore } from "../state/authStore";
import { useWalletStore } from "../state/walletStore";
import { useLockPrefsStore } from "../state/lockPrefsStore";
import type { BiometricGate, AuthResult } from "./biometricGate";
import type { DeviceIntegrity } from "./deviceIntegrity";
import type { WalletManager } from "./walletManager";
import type { PinStore } from "./pinStore";

const UNLOCK_REASON = "解锁 HyperSolid 钱包";

async function loadAndUnlock(manager: WalletManager): Promise<boolean> {
  let wallet;
  try {
    wallet = await manager.loadWallet();
  } catch {
    return false;
  }
  if (!wallet) return false;
  useWalletStore.getState().setLocalWallet(wallet);
  useAuthStore.getState().unlock();
  return true;
}

/**
 * Biometric (convenience) unlock. The mandatory app PIN is the fallback, so on any non-success the
 * caller falls back to PIN entry — biometrics never auto-unlock without success. Fails closed on a
 * compromised/unknown device.
 */
export async function unlockSession(
  gate: BiometricGate,
  manager: WalletManager,
  integrity: DeviceIntegrity,
): Promise<AuthResult> {
  if ((await integrity.check()) !== "trusted") return "compromised";
  const result = await gate.authenticate({ reason: UNLOCK_REASON });
  if (result !== "success") return result;
  return (await loadAndUnlock(manager)) ? "success" : "failed";
}

/**
 * Finalize first-run PIN setup: persist the chosen PIN's verifier, then load the freshly
 * created/restored wallet into memory and unlock. Returns false if the wallet can't be loaded.
 */
export async function completePinSetup(
  pinStore: PinStore,
  manager: WalletManager,
  pin: string,
): Promise<boolean> {
  await pinStore.setPin(pin);
  return loadAndUnlock(manager);
}

export type PinUnlockResult =
  | { status: "unlocked" }
  | { status: "wrong"; remaining: number }
  | { status: "lockedOut" }
  | { status: "compromised" }
  | { status: "failed" };

/**
 * PIN (knowledge-factor) unlock — the primary gate and biometric fallback. Fails closed on a
 * compromised device; counts down / locks out via the PinStore.
 */
export async function unlockWithPin(
  pinStore: PinStore,
  manager: WalletManager,
  integrity: DeviceIntegrity,
  pin: string,
): Promise<PinUnlockResult> {
  if ((await integrity.check()) !== "trusted") return { status: "compromised" };
  const res = await pinStore.verify(pin);
  if (!res.ok) return res.lockedOut ? { status: "lockedOut" } : { status: "wrong", remaining: res.remaining };
  return (await loadAndUnlock(manager)) ? { status: "unlocked" } : { status: "failed" };
}

/**
 * Lock-screen recovery escape so a user is never permanently locked out — e.g. PIN forgotten / locked
 * out, or biometric enrollment changed and invalidated the keychain item. Signs out (wipes the
 * on-device wallet) and clears the PIN, then re-evaluates to the no-wallet onboarding where the user
 * restores from their recovery phrase. CAUTION: erases the local wallet; callers MUST confirm the
 * user has their recovery phrase first.
 */
export async function recoverFromLock(manager: WalletManager, pinStore: PinStore): Promise<void> {
  await manager.signOut();
  await pinStore.clear();
  await useLockPrefsStore.getState().setBiometricEnabled(false);
  useWalletStore.getState().reset();
  await useAuthStore.getState().evaluate(() => manager.hasWallet());
}

export function lockSession(): void {
  useWalletStore.getState().reset();
  useAuthStore.getState().lock();
}
