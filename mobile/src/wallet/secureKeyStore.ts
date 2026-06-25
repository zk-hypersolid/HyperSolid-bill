import * as SecureStore from "expo-secure-store";
import type { KeyStore } from "./types";

const KEY = "hypersolid.wallet.mnemonic";
const PRESENT_KEY = "hypersolid.wallet.present";
// Records whether the mnemonic was stored behind the biometric gate ("1") or, when that is
// unavailable, in a degraded non-auth item ("0"). Read (non-auth) to pick the matching read mode.
const AUTH_MODE_KEY = "hypersolid.wallet.authmode";

const deviceOnly = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY } as const;

/**
 * Device keystore: biometric-gated mnemonic storage (Passkey-local, ADR-011).
 * The work key is hardware-protected (Secure Enclave / StrongBox) and, when the platform supports
 * it, requires authentication on read. A separate non-auth presence marker is used so existence
 * checks never prompt; only the mnemonic read is biometric-gated.
 *
 * Resilience: `requireAuthentication` is unavailable in some runtimes — Expo Go has no
 * `NSFaceIDUsageDescription` (documented limitation), and a device with no passcode enrolled can't
 * create a biometric-ACL keychain item at all. In those cases we fall back to a non-auth item that
 * is STILL hardware-encrypted and device-bound (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`); the session
 * unlock gate (`BiometricGate` / LocalAuthentication in `unlockSession`) still guards access. On a
 * properly-configured dev/release build the strong per-read gate is used (the fallback never fires).
 *
 * NOTE: requireAuthentication items do NOT iCloud-sync; the optional iCloud
 * mnemonic backup must be a separate, non-auth item (spec §5.5).
 */
export class SecureStoreKeyStore implements KeyStore {
  async saveMnemonic(mnemonic: string): Promise<void> {
    let authed = true;
    try {
      await SecureStore.setItemAsync(KEY, mnemonic, { ...deviceOnly, requireAuthentication: true });
    } catch {
      authed = false;
      await SecureStore.setItemAsync(KEY, mnemonic, deviceOnly);
    }
    await SecureStore.setItemAsync(PRESENT_KEY, "1", deviceOnly);
    await SecureStore.setItemAsync(AUTH_MODE_KEY, authed ? "1" : "0", deviceOnly);
  }
  async loadMnemonic(): Promise<string | null> {
    // Read with the same auth mode the mnemonic was written with (default to gated for safety).
    const authed = (await SecureStore.getItemAsync(AUTH_MODE_KEY)) !== "0";
    return authed
      ? SecureStore.getItemAsync(KEY, { requireAuthentication: true })
      : SecureStore.getItemAsync(KEY);
  }
  async has(): Promise<boolean> {
    return (await SecureStore.getItemAsync(PRESENT_KEY)) !== null;
  }
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY);
    await SecureStore.deleteItemAsync(PRESENT_KEY);
    await SecureStore.deleteItemAsync(AUTH_MODE_KEY);
  }
}
