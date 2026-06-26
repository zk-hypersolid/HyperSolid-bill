import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { SheetSelect } from "./SheetSelect";
import { themes } from "../theme/tokens";

const t = themes.electrum;
const sections = [
  { header: "Basic", options: [{ value: "limit", label: "Limit" }, { value: "market", label: "Market" }] },
  { header: "Pro", options: [{ value: "twap", label: "TWAP" }] },
];

describe("SheetSelect", () => {
  it("renders grouped options when visible and marks the active one", () => {
    render(
      <SheetSelect visible title="Order type" sections={sections} value="limit" onSelect={() => {}} onClose={() => {}} theme={t} testIDPrefix="order-type" />,
    );
    expect(screen.getByText("Basic")).toBeTruthy();
    expect(screen.getByText("Pro")).toBeTruthy();
    expect(screen.getByTestId("order-type-opt-limit").props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId("order-type-opt-twap").props.accessibilityState.selected).toBe(false);
  });

  it("selects an option and closes", () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    render(
      <SheetSelect visible sections={sections} value="limit" onSelect={onSelect} onClose={onClose} theme={t} testIDPrefix="order-type" />,
    );
    fireEvent.press(screen.getByTestId("order-type-opt-twap"));
    expect(onSelect).toHaveBeenCalledWith("twap");
    expect(onClose).toHaveBeenCalled();
  });
});
