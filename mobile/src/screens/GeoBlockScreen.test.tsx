import React from "react";
import { render, screen } from "@testing-library/react-native";
import { GeoBlockScreen } from "./GeoBlockScreen";
import { useLocaleStore } from "../state/localeStore";

describe("GeoBlockScreen", () => {
  it("renders the localized unavailable title + body (en)", () => {
    useLocaleStore.setState({ locale: "en" });
    render(<GeoBlockScreen />);
    expect(screen.getByText("HyperSolid is unavailable")).toBeTruthy();
    expect(screen.getByText(/not available in your jurisdiction/i)).toBeTruthy();
  });
  it("renders the Chinese copy when locale is zh", () => {
    useLocaleStore.setState({ locale: "zh" });
    render(<GeoBlockScreen />);
    expect(screen.getByText("HyperSolid 不可用")).toBeTruthy();
  });
});
