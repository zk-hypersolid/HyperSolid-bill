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
  if ((await integrity.check()) === "compromised") return "compromised";
  const result = await gate.authenticate({ reason: UNLOCK_REASON });
  if (result !== "success") return result;
  const wallet = await manager.loadWallet();
  if (!wallet) return "failed";
  useWalletStore.getState().setLocalWallet(wallet);
  useAuthStore.getState().unlock();
  return "success";
}

export function lockSession(): void {
  useWalletStore.getState().reset();
  useAuthStore.getState().lock();
}
