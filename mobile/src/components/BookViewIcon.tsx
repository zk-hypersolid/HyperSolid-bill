import React from "react";
import { View, StyleSheet } from "react-native";
import type { ThemeTokens } from "../theme/tokens";

export type BookView = "balanced" | "asks" | "bids";

/**
 * The HL order-book display-mode glyph: a red (asks) block stacked on a green (bids) block beside a
 * grey bar. The two blocks grow/shrink and dim to reflect the current emphasis (balanced / asks /
 * bids).
 */
export function BookViewIcon({ theme, mode, size = 18 }: { theme: ThemeTokens; mode: BookView; size?: number }) {
  const askFlex = mode === "asks" ? 2 : mode === "bids" ? 1 : 1.4;
  const bidFlex = mode === "bids" ? 2 : mode === "asks" ? 1 : 1.4;
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View style={styles.left}>
        <View style={[styles.block, { flex: askFlex, backgroundColor: theme.down, opacity: mode === "bids" ? 0.4 : 1 }]} />
        <View style={[styles.block, { flex: bidFlex, backgroundColor: theme.up, opacity: mode === "asks" ? 0.4 : 1 }]} />
      </View>
      <View style={[styles.bar, { backgroundColor: theme.muted }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 2.5, alignItems: "stretch" },
  left: { flex: 1, gap: 2 },
  block: { borderRadius: 2 },
  bar: { width: 4, borderRadius: 2 },
});
