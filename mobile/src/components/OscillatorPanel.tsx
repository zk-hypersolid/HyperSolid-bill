import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Line } from "react-native-svg";
import type { ThemeTokens } from "../theme/tokens";
import { fonts } from "../theme/fonts";
import { withAlpha } from "../theme/color";

const VIEW_W = 348;

export interface OscSeries {
  values: (number | null)[];
  color: string;
}

/** Generic auto-scaled oscillator sub-panel (used for MACD/KDJ): draws each series as a line, with a
 * dashed zero baseline when the range crosses zero. `title` carries the indicator label. */
export function OscillatorPanel({
  title,
  series,
  theme,
  height = 56,
}: {
  title: string;
  series: OscSeries[];
  theme: ThemeTokens;
  height?: number;
}) {
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  if (all.length < 2) return <View testID="osc-panel-empty" style={{ height }} />;
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const n = series[0].values.length;
  const x = (i: number) => (i / (n - 1)) * VIEW_W;
  const y = (v: number) => height - ((v - min) / (max - min)) * height;
  const paths = series.map((s) => {
    const pts = s.values.map((v, i) => ({ v, i })).filter((p) => p.v != null) as { v: number; i: number }[];
    return { d: pts.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" "), color: s.color };
  });
  const zeroInRange = min < 0 && max > 0;

  return (
    <View testID="osc-panel" style={[styles.wrap, { height: height + 16 }]}>
      <Text style={[styles.label, { color: theme.faint }]}>{title}</Text>
      <Svg width="100%" height={height} viewBox={`0 0 ${VIEW_W} ${height}`} preserveAspectRatio="none">
        {zeroInRange ? (
          <Line x1={0} y1={y(0)} x2={VIEW_W} y2={y(0)} stroke={withAlpha(theme.muted, 0.3)} strokeWidth={1} strokeDasharray="3 4" />
        ) : null}
        {paths.map((p, i) => (
          <Path key={i} d={p.d} fill="none" stroke={p.color} strokeWidth={1.4} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10 },
  label: { fontFamily: fonts.mono.regular, fontSize: 9, marginBottom: 4 },
});
