import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { WelcomeScreen } from "./WelcomeScreen";
import { useLocaleStore } from "../state/localeStore";

describe("WelcomeScreen", () => {
  beforeEach(() => act(() => useLocaleStore.getState().setLocale("en")));

  it("renders the value prop and both actions", () => {
    render(<WelcomeScreen onGetStarted={jest.fn()} onBrowse={jest.fn()} />);
    expect(screen.getByText(/non-custodial Hyperliquid terminal/)).toBeTruthy();
    expect(screen.getByText("Get started")).toBeTruthy();
    expect(screen.getByText("Browse markets first")).toBeTruthy();
  });

  it("fires onGetStarted and onBrowse", () => {
    const onGetStarted = jest.fn();
    const onBrowse = jest.fn();
    render(<WelcomeScreen onGetStarted={onGetStarted} onBrowse={onBrowse} />);
    fireEvent.press(screen.getByText("Get started"));
    expect(onGetStarted).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText("Browse markets first"));
    expect(onBrowse).toHaveBeenCalledTimes(1);
  });

  it("renders Chinese copy when locale is zh", () => {
    act(() => useLocaleStore.getState().setLocale("zh"));
    render(<WelcomeScreen onGetStarted={jest.fn()} onBrowse={jest.fn()} />);
    expect(screen.getByText("开始设置")).toBeTruthy();
    expect(screen.getByText("先逛逛行情")).toBeTruthy();
  });
});
