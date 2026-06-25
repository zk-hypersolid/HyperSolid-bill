import React, { useRef, useState } from "react";
import { View, StyleSheet, PanResponder, type LayoutChangeEvent } from "react-native";
import { useTheme } from "../theme/useTheme";

const NOTCHES = [0, 25, 50, 75, 100];

/** Clamp a touch x (relative to the track) to a 0–100 percentage. */
export function pctFromX(x: number, width: number): number {
  if (!(width > 0)) return 0;
  const pct = (x / width) * 100;
  return Math.max(0, Math.min(100, pct));
}

/**
 * Horizontal 0–100% slider with quarter notches (no native dependency; PanResponder over a measured
 * track). Controlled via `value`; reports continuous changes through `onChange`.
 */
export function Slider({
  value,
  onChange,
  testID,
}: {
  value: number;
  onChange: (pct: number) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => onChange(pctFromX(e.nativeEvent.locationX, widthRef.current)),
      onPanResponderMove: (e) => onChange(pctFromX(e.nativeEvent.locationX, widthRef.current)),
    }),
  ).current;

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  }

  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.wrap} onLayout={onLayout} testID={testID} {...responder.panHandlers}>
      <View style={[styles.track, { backgroundColor: theme.lineStrong }]} />
      <View style={[styles.fill, { backgroundColor: theme.brand, width: `${clamped}%` }]} />
      {NOTCHES.map((n) => (
        <View
          key={n}
          style={[
            styles.notch,
            { left: `${n}%`, backgroundColor: n <= clamped ? theme.brand : theme.lineStrong },
          ]}
        />
      ))}
      {width > 0 ? (
        <View style={[styles.handle, { left: `${clamped}%`, backgroundColor: theme.brand, borderColor: theme.bg }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 28, justifyContent: "center", marginVertical: 6 },
  track: { height: 3, borderRadius: 2 },
  fill: { position: "absolute", left: 0, height: 3, borderRadius: 2 },
  notch: { position: "absolute", width: 8, height: 8, borderRadius: 4, marginLeft: -4 },
  handle: { position: "absolute", width: 18, height: 18, borderRadius: 9, marginLeft: -9, borderWidth: 3 },
});
