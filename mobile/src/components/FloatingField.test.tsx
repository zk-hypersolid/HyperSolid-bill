import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { FloatingField } from "./FloatingField";
import { themes } from "../theme/tokens";

const t = themes.electrum;

describe("FloatingField", () => {
  it("renders the floating label and the current value", () => {
    render(<FloatingField theme={t} label="Price (USDC)" value="60000" onChange={() => {}} testID="px" />);
    expect(screen.getByText("Price (USDC)")).toBeTruthy();
    expect(screen.getByTestId("px").props.value).toBe("60000");
  });

  it("forwards typed text via onChange", () => {
    const onChange = jest.fn();
    render(<FloatingField theme={t} label="Size" value="" onChange={onChange} testID="sz" />);
    fireEvent.changeText(screen.getByTestId("sz"), "0.5");
    expect(onChange).toHaveBeenCalledWith("0.5");
  });
});
