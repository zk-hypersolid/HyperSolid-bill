import React from "react";
import { View, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import type { ThemeTokens } from "../theme/tokens";

/**
 * Surface card: a calm `surface` panel with a strong hairline border and a thin brand top-rule —
 * the v8 alternative to saturated brand fills, so content keeps AA contrast. The rule is a single
 * 3px brand bar (the source design fades it; we keep one restrained accent and avoid a gradient dep).
 */
export function SurfaceCard({
  theme,
  children,
  rule = true,
  style,
  testID = "surface-card",
}: {
  theme: ThemeTokens;
  children: React.ReactNode;
  rule?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.lineStrong }, style]}
    >
      {rule ? (
        <View testID="surface-card-rule" style={[styles.rule, { backgroundColor: theme.brand }]} />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    borderWidth: 1,
    borderRadius: 15,
    padding: 16,
    marginBottom: 14,
    overflow: "hidden",
  },
  rule: { position: "absolute", left: 0, top: 0, height: 3, width: "100%" },
});
