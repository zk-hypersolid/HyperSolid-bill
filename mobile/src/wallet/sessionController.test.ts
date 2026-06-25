import { unlockSession, unlockWithPin, completePinSetup, lockSession, recoverFromLock } from "./sessionController";
import { useAuthStore } from "../state/authStore";
import { useWalletStore } from "../state/walletStore";
import { AlwaysTrustedIntegrity } from "./deviceIntegrity";
import type { WalletService } from "./types";

const fakeWallet = { getAddress: () => "0xabc" } as unknown as WalletService;
const trusted = new AlwaysTrustedIntegrity();
const compromised = { check: async () => "compromised" as const };
const unknown = { check: async () => "unknown" as const };

beforeEach(() => {
  useAuthStore.setState({ status: "locked", lastActiveAt: 0 });
  useWalletStore.setState({ mode: "none", wallet: null, address: null });
});

describe("sessionController", () => {
  it("refuses on a compromised device: no gate, no load, returns 'compromised'", async () => {
    const gate = { authenticate: jest.fn() };
    const manager = { loadWallet: jest.fn() };
    const r = await unlockSession(gate as never, manager as never, compromised as never);
    expect(r).toBe("compromised");
    expect(gate.authenticate).not.toHaveBeenCalled();
    expect(manager.loadWallet).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe("locked");
  });

  it("fails closed on 'unknown' integrity: blocks without prompting or loading", async () => {
    const gate = { authenticate: jest.fn() };
    const manager = { loadWallet: jest.fn() };
    const r = await unlockSession(gate as never, manager as never, unknown as never);
    expect(r).toBe("compromised");
    expect(gate.authenticate).not.toHaveBeenCalled();
    expect(manager.loadWallet).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe("locked");
  });

  it("on success loads wallet into store and unlocks", async () => {
    const gate = { authenticate: jest.fn().mockResolvedValue("success") };
    const manager = { loadWallet: jest.fn().mockResolvedValue(fakeWallet) };
    const r = await unlockSession(gate as never, manager as never, trusted);
    expect(r).toBe("success");
    expect(useWalletStore.getState().wallet).toBe(fakeWallet);
    expect(useAuthStore.getState().status).toBe("unlocked");
  });

  it("on failed auth keeps locked and loads nothing", async () => {
    const gate = { authenticate: jest.fn().mockResolvedValue("failed") };
    const manager = { loadWallet: jest.fn() };
    const r = await unlockSession(gate as never, manager as never, trusted);
    expect(r).toBe("failed");
    expect(manager.loadWallet).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe("locked");
  });

  it("biometric 'unavailable' returns as-is and does NOT auto-unlock (PIN is the fallback)", async () => {
    const gate = { authenticate: jest.fn().mockResolvedValue("unavailable") };
    const manager = { loadWallet: jest.fn() };
    const r = await unlockSession(gate as never, manager as never, trusted);
    expect(r).toBe("unavailable");
    expect(manager.loadWallet).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe("locked");
  });

  it("unlockWithPin: correct PIN loads the wallet and unlocks", async () => {
    const pinStore = { verify: jest.fn().mockResolvedValue({ ok: true }) };
    const manager = { loadWallet: jest.fn().mockResolvedValue(fakeWallet) };
    const r = await unlockWithPin(pinStore as never, manager as never, trusted, "123456");
    expect(r).toEqual({ status: "unlocked" });
    expect(useWalletStore.getState().wallet).toBe(fakeWallet);
    expect(useAuthStore.getState().status).toBe("unlocked");
  });

  it("unlockWithPin: wrong PIN reports remaining attempts and stays locked", async () => {
    const pinStore = { verify: jest.fn().mockResolvedValue({ ok: false, lockedOut: false, remaining: 7 }) };
    const manager = { loadWallet: jest.fn() };
    const r = await unlockWithPin(pinStore as never, manager as never, trusted, "000000");
    expect(r).toEqual({ status: "wrong", remaining: 7 });
    expect(manager.loadWallet).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe("locked");
  });

  it("unlockWithPin: locked out after too many attempts", async () => {
    const pinStore = { verify: jest.fn().mockResolvedValue({ ok: false, lockedOut: true }) };
    const manager = { loadWallet: jest.fn() };
    const r = await unlockWithPin(pinStore as never, manager as never, trusted, "000000");
    expect(r).toEqual({ status: "lockedOut" });
  });

  it("unlockWithPin: fails closed on a compromised device (no PIN check)", async () => {
    const pinStore = { verify: jest.fn() };
    const manager = { loadWallet: jest.fn() };
    const r = await unlockWithPin(pinStore as never, manager as never, compromised as never, "123456");
    expect(r).toEqual({ status: "compromised" });
    expect(pinStore.verify).not.toHaveBeenCalled();
  });

  it("returns 'failed' when loading the wallet rejects (e.g. read prompt cancelled)", async () => {
    const gate = { authenticate: jest.fn().mockResolvedValue("success") };
    const manager = { loadWallet: jest.fn().mockRejectedValue(new Error("user cancel")) };
    const r = await unlockSession(gate as never, manager as never, trusted);
    expect(r).toBe("failed");
    expect(useAuthStore.getState().status).toBe("locked");
  });

  it("completePinSetup persists the PIN then loads the wallet and unlocks", async () => {
    const pinStore = { setPin: jest.fn().mockResolvedValue(undefined) };
    const manager = { loadWallet: jest.fn().mockResolvedValue(fakeWallet) };
    const ok = await completePinSetup(pinStore as never, manager as never, "123456");
    expect(ok).toBe(true);
    expect(pinStore.setPin).toHaveBeenCalledWith("123456");
    expect(useWalletStore.getState().wallet).toBe(fakeWallet);
    expect(useAuthStore.getState().status).toBe("unlocked");
  });

  it("lockSession clears in-memory wallet and locks", () => {
    useWalletStore.setState({ mode: "local", wallet: fakeWallet, address: "0xabc" });
    useAuthStore.setState({ status: "unlocked", lastActiveAt: 1 });
    lockSession();
    expect(useWalletStore.getState().wallet).toBeNull();
    expect(useAuthStore.getState().status).toBe("locked");
  });

  it("recoverFromLock signs out, clears the PIN and wallet, and re-evaluates to noWallet", async () => {
    useWalletStore.setState({ mode: "local", wallet: fakeWallet, address: "0xabc" });
    const manager = {
      signOut: jest.fn().mockResolvedValue(undefined),
      hasWallet: jest.fn().mockResolvedValue(false),
    };
    const pinStore = { clear: jest.fn().mockResolvedValue(undefined) };
    await recoverFromLock(manager as never, pinStore as never);
    expect(manager.signOut).toHaveBeenCalled();
    expect(pinStore.clear).toHaveBeenCalled();
    expect(useWalletStore.getState().wallet).toBeNull();
    expect(useAuthStore.getState().status).toBe("noWallet");
  });
});
