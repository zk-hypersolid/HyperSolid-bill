import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { ThemeTokens } from "../theme/tokens";

export function BoardPlaceholder({
  title,
  subtitle,
  theme,
}: {
  title: string;
  subtitle: string;
  theme: ThemeTokens;
}) {
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.sub, { color: theme.muted }]}>{subtitle}</Text>
      <Text style={[styles.soon, { color: theme.brand }]}>开发中 · Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  sub: { fontSize: 14, textAlign: "center", marginBottom: 16 },
  soon: { fontSize: 12, fontWeight: "600", letterSpacing: 1 },
});
