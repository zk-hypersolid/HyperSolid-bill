import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const KEY = "hypersolid.lock.biometricEnabled";
const opts = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY } as const;

interface LockPrefsState {
  /** Whether the user opted into biometric unlock as a convenience over the PIN. */
  biometricEnabled: boolean;
  /** Whether the persisted preference has been read from the keychain yet. */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

/**
 * Unlock preferences. Biometric is an OPTIONAL convenience layer over the mandatory app PIN — off by
 * default until the user enables it (during PIN setup or in Wallet settings). Persisted device-bound
 * in the keychain so the choice survives restarts; hydrated once at launch.
 */
export const useLockPrefsStore = create<LockPrefsState>((set) => ({
  biometricEnabled: false,
  hydrated: false,
  hydrate: async () => {
    try {
      const v = await SecureStore.getItemAsync(KEY);
      set({ biometricEnabled: v === "1", hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  setBiometricEnabled: async (biometricEnabled) => {
    set({ biometricEnabled });
    try {
      await SecureStore.setItemAsync(KEY, biometricEnabled ? "1" : "0", opts);
    } catch {
      /* best-effort: state already updated for this session */
    }
  },
}));
