import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Position } from "../lib/hyperliquid/types";
import type { ThemeTokens } from "../theme/tokens";
import { formatSignedPct } from "../lib/hyperliquid/format";

export function PositionRow({ position, theme }: { position: Position; theme: ThemeTokens }) {
  const pnlColor = position.unrealizedPnl >= 0 ? theme.up : theme.down;
  const sideColor = position.side === "long" ? theme.up : theme.down;
  const roe = position.marginUsed ? (position.unrealizedPnl / position.marginUsed) * 100 : 0;
  return (
    <View style={[styles.row, { borderBottomColor: theme.line }]}>
      <View>
        <Text style={[styles.coin, { color: theme.text }]}>
          {position.coin}{" "}
          <Text style={{ color: sideColor }}>
            {position.side === "long" ? "多" : "空"} {position.leverage}x
          </Text>
        </Text>
        <Text style={[styles.sub, { color: theme.muted }]}>
          {`${position.size} @ ${position.entryPx}  强平 ${position.liquidationPx ?? "—"}`}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.pnl, { color: pnlColor }]}>
          {position.unrealizedPnl >= 0 ? "+" : ""}
          {position.unrealizedPnl.toFixed(2)}
        </Text>
        <Text style={[styles.roe, { color: pnlColor }]}>{formatSignedPct(roe)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  coin: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 11, marginTop: 3 },
  right: { alignItems: "flex-end" },
  pnl: { fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] },
  roe: { fontSize: 11, marginTop: 2, fontVariant: ["tabular-nums"] },
});
