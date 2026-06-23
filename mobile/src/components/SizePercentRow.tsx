import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { ThemeTokens } from "../theme/tokens";
import { fonts } from "../theme/fonts";

const STEPS = [25, 50, 75, 100];

/** Quick-size row: sets size = pct × (available × leverage) / price. Inert without balance/price. */
export function SizePercentRow({
  theme,
  available,
  leverage,
  price,
  onPick,
}: {
  theme: ThemeTokens;
  available: number | null;
  leverage: number;
  price: number;
  onPick: (size: string) => void;
}) {
  function pick(pct: number) {
    if (!available || price <= 0) return;
    const maxSize = (available * leverage) / price;
    onPick(((pct / 100) * maxSize).toString());
  }
  return (
    <View style={styles.row}>
      {STEPS.map((pct) => (
        <Pressable
          key={pct}
          onPress={() => pick(pct)}
          accessibilityRole="button"
          style={[styles.chip, { borderColor: theme.line }]}
        >
          <Text style={[styles.text, { color: theme.muted }]}>{`${pct}%`}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginBottom: 12 },
  chip: { flex: 1, alignItems: "center", paddingVertical: 8, borderWidth: 1, borderRadius: 8 },
  text: { fontFamily: fonts.mono.medium, fontSize: 12 },
});
