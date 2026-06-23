import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { SizePercentRow } from "./SizePercentRow";
import { themes } from "../theme/tokens";

const t = themes.electrum;

describe("SizePercentRow", () => {
  it("computes size = pct × (available × leverage) / price and reports it", () => {
    const onPick = jest.fn();
    render(<SizePercentRow theme={t} available={800} leverage={10} price={64000} onPick={onPick} />);
    fireEvent.press(screen.getByText("50%"));
    // 0.5 * (800*10)/64000 = 0.0625
    expect(onPick).toHaveBeenCalledWith("0.0625");
  });

  it("is inert (no value) when balance or price is missing", () => {
    const onPick = jest.fn();
    render(<SizePercentRow theme={t} available={null} leverage={10} price={64000} onPick={onPick} />);
    fireEvent.press(screen.getByText("50%"));
    expect(onPick).not.toHaveBeenCalled();
  });
});
