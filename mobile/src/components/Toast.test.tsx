import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { Toast } from "./Toast";
import { useToastStore } from "../state/toastStore";

describe("Toast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    act(() => useToastStore.setState({ message: null, kind: "info" }));
  });
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it("renders nothing when there is no message", () => {
    render(<Toast />);
    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("shows a message and auto-dismisses after the timeout", () => {
    render(<Toast />);
    act(() => useToastStore.getState().show("Order placed", "success"));
    expect(screen.getByText("Order placed")).toBeTruthy();
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("dismisses early on tap", () => {
    render(<Toast />);
    act(() => useToastStore.getState().show("Saved", "info"));
    fireEvent.press(screen.getByTestId("toast"));
    expect(screen.queryByTestId("toast")).toBeNull();
  });
});
