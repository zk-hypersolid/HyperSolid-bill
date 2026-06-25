import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { fonts } from "../theme/fonts";
import { Icon } from "./Icon";

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Lightweight inline select: a control showing the current label that expands a list of options
 * below it (no native picker / modal positioning). Used for the order-type and TIF menus.
 */
export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  testID,
}: {
  label?: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (v: T) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: theme.muted }]}>{label}</Text> : null}
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={() => setOpen((o) => !o)}
        style={[styles.control, { borderColor: theme.line, backgroundColor: theme.surface }]}
      >
        <Text style={[styles.value, { color: theme.text }]}>{current?.label ?? value}</Text>
        <Icon name="chevronDown" color={theme.muted} size={16} />
      </Pressable>
      {open ? (
        <View style={[styles.menu, { borderColor: theme.line, backgroundColor: theme.surface }]}>
          {options.map((o) => (
            <Pressable
              key={o.value}
              testID={testID ? `${testID}-opt-${o.value}` : undefined}
              accessibilityRole="button"
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={({ pressed }) => [styles.option, { backgroundColor: pressed ? theme.bg : "transparent" }]}
            >
              <Text style={[styles.optionText, { color: o.value === value ? theme.brand : theme.text }]}>
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontFamily: fonts.body.regular, fontSize: 11, marginBottom: 4 },
  control: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  value: { fontFamily: fonts.mono.medium, fontSize: 14 },
  menu: { borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: "hidden" },
  option: { paddingHorizontal: 12, paddingVertical: 11 },
  optionText: { fontFamily: fonts.body.medium, fontSize: 13.5 },
});
