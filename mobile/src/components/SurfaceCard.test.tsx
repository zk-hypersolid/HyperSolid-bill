import React from "react";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { SurfaceCard } from "./SurfaceCard";
import { themes } from "../theme/tokens";

const t = themes.electrum;

describe("SurfaceCard", () => {
  it("renders its children on a surface with a strong hairline border", () => {
    render(
      <SurfaceCard theme={t}>
        <Text>Equity</Text>
      </SurfaceCard>,
    );
    expect(screen.getByText("Equity")).toBeTruthy();
    expect(screen.getByTestId("surface-card")).toHaveStyle({
      backgroundColor: t.surface,
      borderColor: t.lineStrong,
    });
  });

  it("draws a thin brand top-rule by default (not a saturated brand fill)", () => {
    render(
      <SurfaceCard theme={t}>
        <Text>x</Text>
      </SurfaceCard>,
    );
    expect(screen.getByTestId("surface-card-rule")).toHaveStyle({ backgroundColor: t.brand });
  });

  it("omits the rule when rule is false", () => {
    render(
      <SurfaceCard theme={t} rule={false}>
        <Text>x</Text>
      </SurfaceCard>,
    );
    expect(screen.queryByTestId("surface-card-rule")).toBeNull();
  });
});
