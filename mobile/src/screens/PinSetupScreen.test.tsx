import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { PinSetupScreen } from "./PinSetupScreen";
import { useLockPrefsStore } from "../state/lockPrefsStore";
import * as session from "../wallet/sessionController";

jest.mock("../wallet/sessionController", () => ({
  completePinSetup: jest.fn().mockResolvedValue(true),
}));

const completePinSetup = session.completePinSetup as jest.Mock;

function type(pin: string) {
  for (const d of pin) fireEvent.press(screen.getByTestId(`pin-key-${d}`));
}

function setup(available: boolean) {
  const gate = { isAvailable: jest.fn().mockResolvedValue({ hasHardware: available, isEnrolled: available, supportedTypes: [] }) };
  render(<PinSetupScreen pinStore={{} as never} manager={{} as never} gate={gate as never} />);
  return gate;
}

beforeEach(() => {
  jest.clearAllMocks();
  useLockPrefsStore.setState({ setBiometricEnabled: jest.fn().mockResolvedValue(undefined) });
});

describe("PinSetupScreen", () => {
  it("on a mismatch shows an error and returns to the first entry without finalizing", async () => {
    setup(false);
    type("123456");
    await waitFor(() => expect(screen.getByText("Re-enter your PIN")).toBeTruthy());
    type("654321");
    await waitFor(() => expect(screen.getByText("PINs don't match — try again")).toBeTruthy());
    expect(completePinSetup).not.toHaveBeenCalled();
  });

  it("with no biometric hardware, a matching PIN finalizes directly", async () => {
    setup(false);
    type("123456");
    await waitFor(() => expect(screen.getByText("Re-enter your PIN")).toBeTruthy());
    type("123456");
    await waitFor(() => expect(completePinSetup).toHaveBeenCalledWith({}, {}, "123456"));
    expect(useLockPrefsStore.getState().setBiometricEnabled).not.toHaveBeenCalled();
  });

  it("with biometric hardware, offers Face ID and enabling it persists the preference", async () => {
    setup(true);
    type("123456");
    await waitFor(() => expect(screen.getByText("Re-enter your PIN")).toBeTruthy());
    type("123456");
    await waitFor(() => expect(screen.getByTestId("pin-enable-biometric")).toBeTruthy());
    expect(completePinSetup).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("pin-enable-biometric"));
    await waitFor(() => expect(completePinSetup).toHaveBeenCalledWith({}, {}, "123456"));
    expect(useLockPrefsStore.getState().setBiometricEnabled).toHaveBeenCalledWith(true);
  });

  it("skipping Face ID finalizes without enabling biometrics", async () => {
    setup(true);
    type("123456");
    await waitFor(() => expect(screen.getByText("Re-enter your PIN")).toBeTruthy());
    type("123456");
    await waitFor(() => expect(screen.getByTestId("pin-skip-biometric")).toBeTruthy());
    fireEvent.press(screen.getByTestId("pin-skip-biometric"));
    await waitFor(() => expect(completePinSetup).toHaveBeenCalledWith({}, {}, "123456"));
    expect(useLockPrefsStore.getState().setBiometricEnabled).not.toHaveBeenCalled();
  });
});
