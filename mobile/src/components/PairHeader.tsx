import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { ThemeTokens } from "../theme/tokens";
import { fonts } from "../theme/fonts";
import { useT } from "../i18n/useT";
import { Icon } from "./Icon";

/**
 * Hyperliquid-style market header: `{COIN}-USDC  {maxLev}x ▾` with the day change and last price.
 * Pressable to open the coin picker.
 */
export function PairHeader({
  theme,
  coin,
  maxLeverage,
  changePct,
  onPress,
}: {
  theme: ThemeTokens;
  coin: string;
  maxLeverage: number;
  changePct: number;
  onPress?: () => void;
}) {
  const up = changePct >= 0;
  const t = useT();
  return (
    <Pressable accessibilityRole="button" testID="pair-header" onPress={onPress} style={styles.row}>
      <View style={styles.left}>
        <Text style={[styles.pair, { color: theme.text }]}>{`${coin.toUpperCase()}-USDC`}</Text>
        <View style={[styles.levBadge, { borderColor: theme.lineStrong }]}>
          <Text style={[styles.levText, { color: theme.muted }]}>{t("trade.maxLev", { lev: maxLeverage })}</Text>
        </View>
        <Icon name="chevronDown" color={theme.muted} size={16} />
      </View>
      <View style={styles.right}>
        <Text style={[styles.chg, { color: up ? theme.up : theme.down }]}>
          {`${up ? "+" : ""}${changePct.toFixed(2)}%`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  left: { flexDirection: "row", alignItems: "center", gap: 8 },
  pair: { fontFamily: fonts.display.bold, fontSize: 18, letterSpacing: 0.3 },
  levBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  levText: { fontFamily: fonts.mono.bold, fontSize: 10 },
  right: { alignItems: "flex-end" },
  chg: { fontFamily: fonts.mono.medium, fontSize: 13 },
});
