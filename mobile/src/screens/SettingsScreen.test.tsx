import React from "react";
import { Alert } from "react-native";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import { SettingsScreen } from "./SettingsScreen";
import { useWalletStore } from "../state/walletStore";
import { useEnvStore } from "../state/envStore";
import { useLocaleStore } from "../state/localeStore";
import type { WalletManager } from "../wallet/walletManager";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(async () => true) }));

const ADDR = "0x7f3aabcdef0123456789abcdefabcdef0123c2e9";

describe("SettingsScreen", () => {
  beforeEach(() => {
    useEnvStore.setState({ network: "mainnet" });
    useLocaleStore.setState({ locale: "en" });
    useWalletStore.setState({ mode: "local", wallet: {} as never, address: ADDR });
  });

  it("shows app preferences and a sign-out", () => {
    render(<SettingsScreen />);
    expect(screen.getByText("Network")).toBeTruthy();
    expect(screen.getByText("Theme")).toBeTruthy();
    expect(screen.getByText("Language")).toBeTruthy();
    expect(screen.getByText("Sign out / switch wallet")).toBeTruthy();
  });

  it("toggles the locale en <-> zh", () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByText("English"));
    expect(useLocaleStore.getState().locale).toBe("zh");
  });

  it("reveals the recovery phrase via Export & backup", async () => {
    const phrase = "abandon ability able about above absent absorb abstract absurd abuse access accident";
    const manager = { exportMnemonic: jest.fn(async () => phrase) } as unknown as WalletManager;
    render(<SettingsScreen deps={{ manager }} />);
    fireEvent.press(screen.getByText("Export & backup"));
    await waitFor(() => expect(screen.getByText(phrase)).toBeTruthy());
    expect(manager.exportMnemonic).toHaveBeenCalled();
  });

  it("reveals the private key via Export private key", async () => {
    const key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const manager = { exportPrivateKey: jest.fn(async () => key) } as unknown as WalletManager;
    render(<SettingsScreen deps={{ manager }} />);
    fireEvent.press(screen.getByText("Export private key"));
    await waitFor(() => expect(screen.getByTestId("revealed-secret")).toBeTruthy());
    expect(manager.exportPrivateKey).toHaveBeenCalled();
  });

  it("changes the PIN through verify-old + set-new", async () => {
    const change = jest.fn(async () => ({ ok: true }));
    const pinStore = { hasPin: jest.fn(async () => true), change } as never;
    render(<SettingsScreen deps={{ pinStore }} />);
    fireEvent.press(screen.getByText("Change PIN"));
    fireEvent.changeText(screen.getByTestId("changepin-old"), "111111");
    fireEvent.changeText(screen.getByTestId("changepin-new"), "222222");
    fireEvent.changeText(screen.getByTestId("changepin-confirm"), "222222");
    fireEvent.press(screen.getByTestId("changepin-confirm-btn"));
    await waitFor(() => expect(change).toHaveBeenCalledWith("111111", "222222"));
  });

  it("hides wallet-only rows (Change PIN, Auto-lock) for a view-only wallet", () => {
    useWalletStore.setState({ mode: "viewOnly", wallet: null, address: ADDR });
    render(<SettingsScreen />);
    expect(screen.getByText("Network")).toBeTruthy();
    expect(screen.queryByText("Change PIN")).toBeNull();
    expect(screen.queryByText("Auto-lock")).toBeNull();
  });
});
