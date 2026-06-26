import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Segmented } from "./Segmented";
import { themes } from "../theme/tokens";

const t = themes.electrum;
const opts = [
  { value: "Gtc", label: "GTC" },
  { value: "Ioc", label: "IOC" },
  { value: "Alo", label: "ALO" },
];

describe("Segmented", () => {
  it("renders all options and marks the active one as selected", () => {
    render(<Segmented theme={t} value="Gtc" options={opts} onChange={() => {}} testID="tif" />);
    expect(screen.getByTestId("tif-Gtc").props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId("tif-Ioc").props.accessibilityState.selected).toBe(false);
  });

  it("calls onChange with the pressed value", () => {
    const onChange = jest.fn();
    render(<Segmented theme={t} value="Gtc" options={opts} onChange={onChange} testID="tif" />);
    fireEvent.press(screen.getByTestId("tif-Alo"));
    expect(onChange).toHaveBeenCalledWith("Alo");
  });
});
