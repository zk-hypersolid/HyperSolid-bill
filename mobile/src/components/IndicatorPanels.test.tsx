import React from "react";
import { render, screen } from "@testing-library/react-native";
import { OscillatorPanel } from "./OscillatorPanel";
import { VolumePanel } from "./VolumePanel";
import { themes } from "../theme/tokens";

describe("OscillatorPanel", () => {
  it("renders the title and a panel for multi-series data", () => {
    render(
      <OscillatorPanel
        theme={themes.electrum}
        title="MACD 1.23"
        series={[
          { values: [null, 1, 2, 3], color: "#fff" },
          { values: [null, 0.5, 1, 1.5], color: "#aaa" },
        ]}
      />,
    );
    expect(screen.getByText("MACD 1.23")).toBeTruthy();
    expect(screen.getByTestId("osc-panel")).toBeTruthy();
  });

  it("renders an empty placeholder when there is too little data", () => {
    render(<OscillatorPanel theme={themes.electrum} title="KDJ" series={[{ values: [null], color: "#fff" }]} />);
    expect(screen.getByTestId("osc-panel-empty")).toBeTruthy();
  });
});

describe("VolumePanel", () => {
  it("renders bars with the latest volume labelled", () => {
    render(
      <VolumePanel
        theme={themes.electrum}
        candles={[
          { volume: 100, open: 1, close: 2 },
          { volume: 250, open: 2, close: 1 },
        ]}
      />,
    );
    expect(screen.getByText("VOL 250")).toBeTruthy();
    expect(screen.getByTestId("vol-panel")).toBeTruthy();
  });
});
