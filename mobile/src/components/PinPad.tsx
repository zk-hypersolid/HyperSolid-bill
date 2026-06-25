import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { fonts } from "../theme/fonts";
import { Icon } from "./Icon";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

/** A 6-dot PIN entry pad. Controlled: parent owns `value` and reacts when it reaches `length`. */
export function PinPad({
  value,
  onChange,
  length = 6,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  disabled?: boolean;
}) {
  const theme = useTheme();

  function press(k: string) {
    if (disabled) return;
    if (k === "del") onChange(value.slice(0, -1));
    else if (k && value.length < length) onChange(value + k);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.dots}>
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            testID={i < value.length ? "pin-dot-filled" : "pin-dot-empty"}
            style={[
              styles.dot,
              { borderColor: theme.lineStrong, backgroundColor: i < value.length ? theme.brand : "transparent" },
            ]}
          />
        ))}
      </View>
      <View style={styles.pad}>
        {KEYS.map((k, i) =>
          k === "" ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable
              key={i}
              accessibilityRole="button"
              testID={`pin-key-${k}`}
              onPress={() => press(k)}
              style={({ pressed }) => [
                styles.key,
                styles.keyBtn,
                { borderColor: theme.line, backgroundColor: pressed ? theme.surface : "transparent" },
              ]}
            >
              {k === "del" ? (
                <Icon name="backspace" color={theme.text} size={24} strokeWidth={1.8} />
              ) : (
                <Text style={[styles.keyText, { color: theme.text }]}>{k}</Text>
              )}
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 28 },
  dots: { flexDirection: "row", gap: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  pad: { flexDirection: "row", flexWrap: "wrap", width: 300, justifyContent: "space-between", rowGap: 14 },
  key: { width: 88, height: 64, alignItems: "center", justifyContent: "center" },
  keyBtn: { borderRadius: 14, borderWidth: 1 },
  keyText: { fontFamily: fonts.mono.medium, fontSize: 26 },
});
