import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ChangeText } from "./ChangeText";
import { fonts } from "../theme/fonts";
import { themes } from "../theme/tokens";

const t = themes.electrum;

describe("ChangeText", () => {
  it("prefixes a ▲ and the up token for non-negative change", () => {
    render(<ChangeText theme={t} value={2.27} testID="chg" />);
    const node = screen.getByTestId("chg");
    expect(node).toHaveTextContent(/▲/);
    expect(node).toHaveTextContent(/\+2\.27%/);
    expect(node).toHaveStyle({ color: t.up });
  });

  it("prefixes a ▼ and the down token for negative change", () => {
    render(<ChangeText theme={t} value={-2.06} testID="chg" />);
    const node = screen.getByTestId("chg");
    expect(node).toHaveTextContent(/▼/);
    expect(node).toHaveTextContent(/-2\.06%/);
    expect(node).toHaveStyle({ color: t.down });
  });

  it("renders tabular mono numerals", () => {
    render(<ChangeText theme={t} value={1} testID="chg" />);
    expect(screen.getByTestId("chg")).toHaveStyle({
      fontFamily: fonts.mono.bold,
      fontVariant: ["tabular-nums"],
    });
  });

  it("omits the arrow when showArrow is false", () => {
    render(<ChangeText theme={t} value={1.5} showArrow={false} testID="chg" />);
    const node = screen.getByTestId("chg");
    expect(node).toHaveTextContent("+1.50%");
    expect(node).not.toHaveTextContent("▲");
  });
});
