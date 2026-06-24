import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect } from "react-native-svg";
import type { ThemeTokens } from "../theme/tokens";
import { fonts } from "../theme/fonts";
import { withAlpha } from "../theme/color";

const VIEW_W = 348;

/** Volume sub-panel: a bar per candle, tinted up/down by the candle's close vs open. */
export function VolumePanel({
  candles,
  theme,
  height = 56,
}: {
  candles: { volume: number; open: number; close: number }[];
  theme: ThemeTokens;
  height?: number;
}) {
  if (candles.length < 1) return <View testID="vol-panel-empty" style={{ height }} />;
  const max = Math.max(...candles.map((c) => c.volume), 1);
  const n = candles.length;
  const bw = VIEW_W / n;
  const latest = candles[n - 1].volume;

  return (
    <View testID="vol-panel" style={[styles.wrap, { height: height + 16 }]}>
      <Text style={[styles.label, { color: theme.faint }]}>{`VOL ${latest.toFixed(0)}`}</Text>
      <Svg width="100%" height={height} viewBox={`0 0 ${VIEW_W} ${height}`} preserveAspectRatio="none">
        {candles.map((c, i) => {
          const h = (c.volume / max) * height;
          const color = c.close >= c.open ? theme.up : theme.down;
          return <Rect key={i} x={i * bw + 0.5} y={height - h} width={Math.max(0.5, bw - 1)} height={h} fill={withAlpha(color, 0.5)} />;
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10 },
  label: { fontFamily: fonts.mono.regular, fontSize: 9, marginBottom: 4 },
});
