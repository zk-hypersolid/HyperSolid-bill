import React from "react";
import { Text, StyleSheet, type TextStyle } from "react-native";
import { fonts } from "../theme/fonts";

export function formatPrice(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 4 });
}

export function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/**
 * Tabular price number in the v8 mono voice (JetBrains Mono). `glow` lights a single restrained
 * phosphor halo and is reserved for hero numbers — pass `glowColor` (a theme token) to enable it.
 */
export function PriceText({
  value,
  color,
  size = 16,
  glow = false,
  glowColor,
  testID,
}: {
  value: number;
  color: string;
  size?: number;
  glow?: boolean;
  glowColor?: string;
  testID?: string;
}) {
  const glowStyle: TextStyle | null =
    glow && glowColor
      ? { textShadowColor: glowColor, textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } }
      : null;
  return (
    <Text testID={testID} style={[styles.num, { color, fontSize: size }, glowStyle]}>
      {formatPrice(value)}
    </Text>
  );
}

const styles = StyleSheet.create({
  num: { fontFamily: fonts.mono.medium, fontVariant: ["tabular-nums"] },
});
