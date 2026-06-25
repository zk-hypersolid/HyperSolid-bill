let mockAuthSupported = true;
const mockStore = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(async (k: string, v: string, opts?: { requireAuthentication?: boolean }) => {
    if (opts?.requireAuthentication && !mockAuthSupported) {
      throw new Error(
        "Calling the 'setValueWithKeyAsync' function has failed → You must set `NSFaceIDUsageDescription`",
      );
    }
    mockStore.set(k, v);
  }),
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "whenUnlockedThisDeviceOnly",
}));

import * as SecureStore from "expo-secure-store";
import { SecureStoreKeyStore } from "./secureKeyStore";

const setItemAsync = SecureStore.setItemAsync as jest.Mock;
const getItemAsync = SecureStore.getItemAsync as jest.Mock;
const KEY = "hypersolid.wallet.mnemonic";

describe("SecureStoreKeyStore", () => {
  beforeEach(() => {
    mockStore.clear();
    setItemAsync.mockClear();
    getItemAsync.mockClear();
    mockAuthSupported = true;
  });

  it("stores the mnemonic behind the biometric gate when supported", async () => {
    const ks = new SecureStoreKeyStore();
    await ks.saveMnemonic("seed words");
    const keyWrite = setItemAsync.mock.calls.find((c) => c[0] === KEY)!;
    expect((keyWrite[2] as { requireAuthentication?: boolean }).requireAuthentication).toBe(true);
    expect(await ks.has()).toBe(true);
    expect(await ks.loadMnemonic()).toBe("seed words");
    const gatedRead = getItemAsync.mock.calls.find((c) => c[0] === KEY)!;
    expect((gatedRead[1] as { requireAuthentication?: boolean } | undefined)?.requireAuthentication).toBe(true);
  });

  it("falls back to non-auth storage when requireAuthentication is unsupported (Expo Go / no passcode)", async () => {
    mockAuthSupported = false;
    const ks = new SecureStoreKeyStore();
    await expect(ks.saveMnemonic("seed words")).resolves.toBeUndefined();
    expect(await ks.has()).toBe(true);
    getItemAsync.mockClear();
    expect(await ks.loadMnemonic()).toBe("seed words");
    const read = getItemAsync.mock.calls.find((c) => c[0] === KEY)!;
    expect((read[1] as { requireAuthentication?: boolean } | undefined)?.requireAuthentication).toBeFalsy();
  });

  it("clears all keys on sign-out", async () => {
    const ks = new SecureStoreKeyStore();
    await ks.saveMnemonic("seed words");
    await ks.clear();
    expect(await ks.has()).toBe(false);
    expect(await ks.loadMnemonic()).toBeNull();
  });
});
