import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { ThemeTokens } from "../theme/tokens";
import { fonts } from "../theme/fonts";
import { withAlpha } from "../theme/color";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Inline single-select chip row (always-visible options, no dropdown) — used for the order-ticket
 * TIF selector. The active chip is tinted with the brand colour. Each chip's testID is
 * `${testID}-${value}`.
 */
export function Segmented<T extends string>({
  theme,
  value,
  options,
  onChange,
  label,
  testID,
}: {
  theme: ThemeTokens;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (v: T) => void;
  label?: string;
  testID?: string;
}) {
  return (
    <View style={styles.row}>
      {label ? <Text style={[styles.label, { color: theme.muted }]}>{label}</Text> : null}
      <View style={styles.seg}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              testID={testID ? `${testID}-${o.value}` : undefined}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(o.value)}
              style={[
                styles.chip,
                {
                  borderColor: active ? theme.brand : theme.line,
                  backgroundColor: active ? withAlpha(theme.brand, 0.14) : "transparent",
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? theme.brand : theme.muted }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  label: { fontFamily: fonts.body.medium, fontSize: 11, marginRight: 8 },
  seg: { flexDirection: "row", flex: 1, gap: 6 },
  chip: { flex: 1, alignItems: "center", paddingVertical: 7, borderWidth: 1, borderRadius: 8 },
  chipText: { fontFamily: fonts.mono.bold, fontSize: 12, letterSpacing: 0.3 },
});
