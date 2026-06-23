import React from "react";
import { render, screen } from "@testing-library/react-native";
import { CandleChart } from "./CandleChart";
import { themes } from "../theme/tokens";
import type { Candle } from "../lib/hyperliquid/types";

const t = themes.electrum;
const candles: Candle[] = [
  { t: 1, open: 64000, close: 64200, high: 64300, low: 63950, volume: 10 },
  { t: 2, open: 64200, close: 64100, high: 64250, low: 64050, volume: 12 },
  { t: 3, open: 64100, close: 64600, high: 64700, low: 64080, volume: 15 },
];

describe("CandleChart", () => {
  it("renders an empty placeholder when there are no candles", () => {
    render(<CandleChart candles={[]} theme={t} currentPrice={0} />);
    expect(screen.getByTestId("candle-chart-empty")).toBeTruthy();
    expect(screen.queryByTestId("candle-chart")).toBeNull();
  });

  it("draws the chart and a current-price readout when candles exist", () => {
    render(<CandleChart candles={candles} theme={t} currentPrice={64550} />);
    expect(screen.getByTestId("candle-chart")).toBeTruthy();
    expect(screen.getByTestId("candle-current-price")).toHaveTextContent("64,550");
  });

  it("labels the price axis with grouped numerals", () => {
    render(<CandleChart candles={candles} theme={t} currentPrice={64550} axisCount={3} />);
    expect(screen.getAllByTestId("candle-axis-label").length).toBe(3);
  });

  it("draws indicator overlays when provided", () => {
    render(
      <CandleChart
        candles={candles}
        theme={t}
        currentPrice={64550}
        overlays={[{ values: [64000, 64100, 64600], color: t.brand }]}
      />,
    );
    expect(screen.getByTestId("candle-chart")).toBeTruthy();
  });
});
