import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { ThemeTokens } from "../theme/tokens";
import { useT } from "../i18n/useT";

/**
 * Persistent, honest disclosure of unconfirmed (pending/submitted/orphan) intents (spec §6.1).
 * Distinct from the transient post-submit notice: this is driven by the durable ledger and so
 * survives restarts and startup recovery. Renders nothing when there is nothing to disclose.
 */
export function UnconfirmedBanner({
  theme,
  count,
  onReview,
  reviewLabel,
}: {
  theme: ThemeTokens;
  count: number;
  onReview?: () => void;
  reviewLabel?: string;
}) {
  const t = useT();
  if (count <= 0) return null;
  return (
    <View
      testID="unconfirmed-banner"
      style={[styles.box, { borderColor: theme.down, backgroundColor: theme.surface }]}
    >
      <Text style={[styles.title, { color: theme.down }]}>{t("banner.unconfirmedTitle", { count })}</Text>
      <Text style={[styles.body, { color: theme.muted }]}>{t("banner.unconfirmedBody")}</Text>
      {onReview ? (
        <Pressable
          onPress={onReview}
          accessibilityRole="button"
          testID="unconfirmed-review"
          style={[styles.action, { borderColor: theme.brand }]}
        >
          <Text style={[styles.actionText, { color: theme.brand }]}>{reviewLabel ?? t("banner.review")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  title: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  body: { fontSize: 12, lineHeight: 17 },
  action: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 10 },
  actionText: { fontSize: 14, fontWeight: "700" },
});
