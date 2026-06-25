import { useAuthStore } from "../state/authStore";
import { useWalletStore } from "../state/walletStore";
import type { BiometricGate, AuthResult } from "./biometricGate";
import type { DeviceIntegrity } from "./deviceIntegrity";
import type { WalletManager } from "./walletManager";

const UNLOCK_REASON = "解锁 HyperSolid 钱包";

export async function unlockSession(
  gate: BiometricGate,
  manager: WalletManager,
  integrity: DeviceIntegrity,
): Promise<AuthResult> {
  // Fail closed: only a positively-trusted device may unlock/sign. "compromised"
  // (rooted/jailbroken) and "unknown" (detection failed/indeterminate — the state
  // a tampered runtime can induce) both block before any biometric prompt or key load.
  if ((await integrity.check()) !== "trusted") return "compromised";
  const result = await gate.authenticate({ reason: UNLOCK_REASON });
  // "unavailable" = the device has no usable/enrolled biometrics. The mnemonic was stored non-auth in
  // that case (SecureStoreKeyStore falls back), so proceed to load it — otherwise a device that was
  // allowed to create a wallet without biometrics could never unlock it. A genuine biometric
  // "failed"/"cancelled" still blocks; "compromised" already returned above.
  if (result !== "success" && result !== "unavailable") return result;
  let wallet;
  try {
    wallet = await manager.loadWallet();
  } catch {
    return "failed";
  }
  if (!wallet) return "failed";
  useWalletStore.getState().setLocalWallet(wallet);
  useAuthStore.getState().unlock();
  return "success";
}

/**
 * Lock-screen recovery escape so a user is never permanently locked out — e.g. biometrics were never
 * enrolled, or enrollment changed and invalidated the biometric-gated keychain item. Signs out (wipes
 * the on-device wallet) and re-evaluates to the no-wallet onboarding, where the user restores from
 * their recovery phrase. CAUTION: this erases the local wallet; callers MUST confirm the user has
 * their recovery phrase first.
 */
export async function recoverFromLock(manager: WalletManager): Promise<void> {
  await manager.signOut();
  useWalletStore.getState().reset();
  await useAuthStore.getState().evaluate(() => manager.hasWallet());
}

export function lockSession(): void {
  useWalletStore.getState().reset();
  useAuthStore.getState().lock();
}
