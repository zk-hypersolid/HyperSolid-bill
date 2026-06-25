import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { LockScreen } from "./LockScreen";
import { useLocaleStore } from "../state/localeStore";

const okPin = jest.fn().mockResolvedValue({ status: "unlocked" });

function type(pin: string) {
  for (const d of pin) fireEvent.press(screen.getByTestId(`pin-key-${d}`));
}

beforeEach(() => {
  jest.clearAllMocks();
  act(() => useLocaleStore.getState().setLocale("en"));
});

describe("LockScreen", () => {
  it("renders the PIN prompt and does NOT auto-trigger biometrics when they're disabled", async () => {
    const bio = jest.fn().mockResolvedValue("success");
    render(<LockScreen onUnlockBiometric={bio} onUnlockPin={okPin} biometricEnabled={false} />);
    expect(screen.getByText("HyperSolid locked")).toBeTruthy();
    expect(screen.getByText("Enter your PIN")).toBeTruthy();
    expect(screen.queryAllByTestId("pin-dot-empty")).toHaveLength(6);
    await waitFor(() => expect(bio).not.toHaveBeenCalled());
  });

  it("auto-triggers the biometric prompt once on mount when enabled", async () => {
    const bio = jest.fn().mockResolvedValue("success");
    render(<LockScreen onUnlockBiometric={bio} onUnlockPin={okPin} biometricEnabled={true} />);
    await waitFor(() => expect(bio).toHaveBeenCalledTimes(1));
  });

  it("submits the PIN once six digits are entered", async () => {
    render(<LockScreen onUnlockBiometric={jest.fn()} onUnlockPin={okPin} biometricEnabled={false} />);
    type("123456");
    await waitFor(() => expect(okPin).toHaveBeenCalledWith("123456"));
  });

  it("shows remaining attempts and clears the pad on a wrong PIN", async () => {
    const wrong = jest.fn().mockResolvedValue({ status: "wrong", remaining: 7 });
    render(<LockScreen onUnlockBiometric={jest.fn()} onUnlockPin={wrong} biometricEnabled={false} />);
    type("000000");
    await waitFor(() => expect(screen.getByText(/7 attempts left/)).toBeTruthy());
    expect(screen.queryAllByTestId("pin-dot-filled")).toHaveLength(0);
  });

  it("locks out after too many attempts and disables the pad", async () => {
    const out = jest.fn().mockResolvedValue({ status: "lockedOut" });
    render(<LockScreen onUnlockBiometric={jest.fn()} onUnlockPin={out} biometricEnabled={false} />);
    type("000000");
    await waitFor(() => expect(screen.getByText(/Too many attempts/)).toBeTruthy());
    // pad disabled: a further press registers nothing
    fireEvent.press(screen.getByTestId("pin-key-1"));
    expect(screen.queryAllByTestId("pin-dot-filled")).toHaveLength(0);
  });

  it("falls back to PIN entry when biometrics fail (no scary copy)", async () => {
    const bio = jest.fn().mockResolvedValue("failed");
    render(<LockScreen onUnlockBiometric={bio} onUnlockPin={okPin} biometricEnabled={true} />);
    await waitFor(() => expect(bio).toHaveBeenCalled());
    // PIN pad remains usable
    type("123456");
    await waitFor(() => expect(okPin).toHaveBeenCalledWith("123456"));
  });

  it("warns when the device is compromised", async () => {
    const out = jest.fn().mockResolvedValue({ status: "compromised" });
    render(<LockScreen onUnlockBiometric={jest.fn()} onUnlockPin={out} biometricEnabled={false} />);
    type("123456");
    await waitFor(() => expect(screen.getByText(/security check failed/)).toBeTruthy());
  });

  it("re-triggers biometrics via the 'Use Face ID' button", async () => {
    const bio = jest.fn().mockResolvedValue("failed");
    render(<LockScreen onUnlockBiometric={bio} onUnlockPin={okPin} biometricEnabled={true} />);
    await waitFor(() => expect(bio).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByTestId("lock-biometric"));
    await waitFor(() => expect(bio).toHaveBeenCalledTimes(2));
  });

  it("offers a recovery escape that confirms before signing out", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const onRecover = jest.fn();
    render(
      <LockScreen onUnlockBiometric={jest.fn()} onUnlockPin={okPin} biometricEnabled={false} onRecover={onRecover} />,
    );
    fireEvent.press(screen.getByTestId("lock-recover"));
    expect(alertSpy).toHaveBeenCalled();
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === "Sign out")!.onPress?.();
    expect(onRecover).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });

  it("omits the recovery escape when no onRecover is provided", () => {
    render(<LockScreen onUnlockBiometric={jest.fn()} onUnlockPin={okPin} biometricEnabled={false} />);
    expect(screen.queryByTestId("lock-recover")).toBeNull();
  });

  it("renders Chinese copy when the locale is zh", () => {
    act(() => useLocaleStore.getState().setLocale("zh"));
    render(<LockScreen onUnlockBiometric={jest.fn()} onUnlockPin={okPin} biometricEnabled={false} />);
    expect(screen.getByText("HyperSolid 已锁定")).toBeTruthy();
    expect(screen.getByText("输入 PIN")).toBeTruthy();
  });
});
