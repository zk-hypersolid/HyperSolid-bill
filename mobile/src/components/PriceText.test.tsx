import React from "react";
import { render, screen } from "@testing-library/react-native";
import { PriceText, formatPrice, formatPct } from "./PriceText";
import { fonts } from "../theme/fonts";
import { themes } from "../theme/tokens";

const t = themes.electrum;

describe("formatPrice / formatPct", () => {
  it("formats prices with grouping", () => {
    expect(formatPrice(64731.5)).toBe("64,731.5");
  });

  it("signs percentages", () => {
    expect(formatPct(2.27)).toBe("+2.27%");
    expect(formatPct(-2.06)).toBe("-2.06%");
  });
});

describe("PriceText", () => {
  it("renders the formatted value with the given color in tabular mono", () => {
    render(<PriceText value={64731.5} color={t.text} testID="px" />);
    const node = screen.getByTestId("px");
    expect(node).toHaveTextContent("64,731.5");
    expect(node).toHaveStyle({
      color: t.text,
      fontFamily: fonts.mono.medium,
      fontVariant: ["tabular-nums"],
    });
  });

  it("applies a restrained glow only when asked (hero numbers)", () => {
    render(<PriceText value={1} color={t.text} glow glowColor={t.glow} testID="hero" />);
    expect(screen.getByTestId("hero")).toHaveStyle({
      textShadowColor: t.glow,
      textShadowRadius: 18,
    });
  });

  it("has no text shadow by default", () => {
    render(<PriceText value={1} color={t.text} testID="plain" />);
    expect(screen.getByTestId("plain")).not.toHaveStyle({ textShadowRadius: 18 });
  });
});
