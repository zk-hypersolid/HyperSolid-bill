import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Line, Rect, Path } from "react-native-svg";
import type { Candle } from "../lib/hyperliquid/types";
import type { ThemeTokens } from "../theme/tokens";
import { fonts } from "../theme/fonts";
import { withAlpha } from "../theme/color";

const VIEW_W = 348;

/**
 * Candlestick chart in the v8 grammar: faint brand grid, up/down candles, a dashed brand
 * current-price line and a right-edge price badge. Pure SVG (react-native-svg) — no chart dep.
 * Axis prices and the badge are real <Text> so they stay legible and theme-tinted.
 */
export function CandleChart({
  candles,
  theme,
  currentPrice,
  height = 176,
  axisCount = 4,
  overlays,
}: {
  candles: Candle[];
  theme: ThemeTokens;
  currentPrice: number;
  height?: number;
  axisCount?: number;
  overlays?: Array<{ values: (number | null)[]; color: string }>;
}) {
  if (candles.length === 0) {
    return <View testID="candle-chart-empty" style={{ height }} />;
  }

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const pad = (Math.max(...highs) - Math.min(...lows)) * 0.08 || 1;
  const max = Math.max(...highs, currentPrice) + pad;
  const min = Math.min(...lows, currentPrice) - pad;
  const span = max - min || 1;
  const y = (v: number) => ((max - v) / span) * height;
  const cw = VIEW_W / candles.length;

  const axisPrices = Array.from({ length: axisCount }, (_, i) =>
    max - (span * (i + 0.5)) / axisCount,
  );
  const cy = Math.min(height - 9, Math.max(2, y(currentPrice) - 8));

  return (
    <View testID="candle-chart" style={[styles.wrap, { height }]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${VIEW_W} ${height}`} preserveAspectRatio="none">
        {axisPrices.map((p, i) => (
          <Line
            key={`g${i}`}
            x1={0}
            y1={y(p)}
            x2={VIEW_W}
            y2={y(p)}
            stroke={withAlpha(theme.brand, 0.05)}
            strokeWidth={1}
          />
        ))}
        {candles.map((c, i) => {
          const x = i * cw + cw / 2;
          const up = c.close >= c.open;
          const col = up ? theme.up : theme.down;
          const top = y(Math.max(c.open, c.close));
          const bot = y(Math.min(c.open, c.close));
          return (
            <React.Fragment key={`c${i}`}>
              <Line x1={x} y1={y(c.high)} x2={x} y2={y(c.low)} stroke={col} strokeWidth={1.1} />
              <Rect
                x={x - cw * 0.32}
                y={top}
                width={cw * 0.64}
                height={Math.max(1.5, bot - top)}
                fill={col}
              />
            </React.Fragment>
          );
        })}
        {(overlays ?? []).map((o, oi) => {
          const d = o.values
            .map((v, i) =>
              v == null
                ? null
                : `${i === 0 || o.values[i - 1] == null ? "M" : "L"}${(i * cw + cw / 2).toFixed(1)} ${y(v).toFixed(1)}`,
            )
            .filter(Boolean)
            .join(" ");
          return d ? <Path key={`o${oi}`} d={d} fill="none" stroke={o.color} strokeWidth={1.2} /> : null;
        })}
        <Line
          x1={0}
          y1={y(currentPrice)}
          x2={VIEW_W}
          y2={y(currentPrice)}
          stroke={theme.brand}
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      </Svg>

      <View pointerEvents="none" style={styles.axis}>
        {axisPrices.map((p, i) => (
          <Text
            key={`a${i}`}
            testID="candle-axis-label"
            style={[styles.axisLabel, { color: theme.faint, top: y(p) - 6 }]}
          >
            {Math.round(p).toLocaleString("en-US")}
          </Text>
        ))}
      </View>

      <Text
        testID="candle-current-price"
        style={[
          styles.badge,
          { top: cy, color: theme.bg, backgroundColor: theme.brand },
        ]}
      >
        {Math.round(currentPrice).toLocaleString("en-US")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", width: "100%" },
  axis: { position: "absolute", left: 4, top: 0, bottom: 0 },
  axisLabel: { position: "absolute", left: 0, fontFamily: fonts.mono.regular, fontSize: 9 },
  badge: {
    position: "absolute",
    right: 0,
    fontFamily: fonts.mono.bold,
    fontSize: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
});
