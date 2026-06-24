import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { useT } from "../i18n/useT";
import { fonts } from "../theme/fonts";
import { Icon } from "../components/Icon";

/**
 * First-run welcome shown to no-wallet users on launch (gated in App.tsx). "Get started" routes the
 * user straight to the Wallet tab to set up; "Browse markets first" drops them on Markets. Both
 * dismiss the welcome for the session via the onboarding store.
 */
export function WelcomeScreen({
  onGetStarted,
  onBrowse,
}: {
  onGetStarted: () => void;
  onBrowse: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Icon name="star" active color={theme.brand} size={44} />
      <Text style={[styles.title, { color: theme.text }]}>{t("welcome.title")}</Text>
      <Text style={[styles.body, { color: theme.muted }]}>{t("welcome.body")}</Text>

      <Pressable
        accessibilityRole="button"
        onPress={onGetStarted}
        style={[styles.btn, { backgroundColor: theme.brand }]}
      >
        <Text style={[styles.btnText, { color: theme.bg }]}>{t("welcome.getStarted")}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onBrowse} style={styles.linkBtn}>
        <Text style={[styles.linkText, { color: theme.muted }]}>{t("welcome.browse")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 14 },
  title: { fontFamily: fonts.display.bold, fontSize: 22, textAlign: "center", marginTop: 6 },
  body: { fontFamily: fonts.body.regular, fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 8 },
  btn: { paddingVertical: 14, paddingHorizontal: 48, borderRadius: 12, marginTop: 4 },
  btnText: { fontFamily: fonts.display.bold, fontSize: 16, letterSpacing: 0.3 },
  linkBtn: { paddingVertical: 8 },
  linkText: { fontFamily: fonts.body.medium, fontSize: 13, textDecorationLine: "underline" },
});
