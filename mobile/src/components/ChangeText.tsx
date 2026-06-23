import React from "react";
import { Text, StyleSheet } from "react-native";
import type { ThemeTokens } from "../theme/tokens";
import { fonts } from "../theme/fonts";
import { formatPct } from "./PriceText";

/**
 * Signed percentage change in the v8 grammar: a geometric ▲/▼ marker (not an emoji) plus the
 * signed value, colored from the up/down tokens. Tabular mono so columns stay aligned.
 */
export function ChangeText({
  value,
  theme,
  size = 12,
  showArrow = true,
  testID,
}: {
  value: number;
  theme: ThemeTokens;
  size?: number;
  showArrow?: boolean;
  testID?: string;
}) {
  const up = value >= 0;
  const arrow = showArrow ? (up ? "▲ " : "▼ ") : "";
  return (
    <Text
      testID={testID}
      style={[styles.chg, { color: up ? theme.up : theme.down, fontSize: size }]}
    >
      {`${arrow}${formatPct(value)}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  chg: { fontFamily: fonts.mono.bold, fontVariant: ["tabular-nums"] },
});
