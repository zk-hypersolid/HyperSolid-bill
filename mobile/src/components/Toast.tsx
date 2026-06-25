import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToastStore } from "../state/toastStore";
import { useTheme } from "../theme/useTheme";
import { fonts } from "../theme/fonts";

const VISIBLE_MS = 3000;

/** Global toast overlay — rendered once at the app root. Auto-dismisses; tap to dismiss early. */
export function Toast() {
  const message = useToastStore((s) => s.message);
  const kind = useToastStore((s) => s.kind);
  const hide = useToastStore((s) => s.hide);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(hide, VISIBLE_MS);
    return () => clearTimeout(id);
  }, [message, hide]);

  if (!message) return null;
  const accent = kind === "success" ? theme.up : kind === "error" ? theme.down : theme.brand;
  return (
    <View style={[styles.wrap, { top: insets.top + 10 }]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        testID="toast"
        onPress={hide}
        style={[styles.toast, { backgroundColor: theme.surface, borderColor: accent }]}
      >
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <Text style={[styles.text, { color: theme.text }]} numberOfLines={2}>
          {message}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center", paddingHorizontal: 16, zIndex: 100 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    maxWidth: 460,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { flex: 1, fontFamily: fonts.body.semibold, fontSize: 13 },
});
