import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/useTheme";
import { useT } from "../i18n/useT";
import { fonts } from "../theme/fonts";

/** Full-screen compliance block for restricted jurisdictions (spec §9). No navigation into the app. */
export function GeoBlockScreen() {
  const theme = useTheme();
  const t = useT();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} testID="geo-block">
      <View style={styles.center}>
        <Text style={[styles.title, { color: theme.text }]}>{t("geo.blockedTitle")}</Text>
        <Text style={[styles.body, { color: theme.muted }]}>{t("geo.blockedBody")}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  title: { fontFamily: fonts.display.bold, fontSize: 20, textAlign: "center" },
  body: { fontFamily: fonts.body.regular, fontSize: 15, lineHeight: 22, textAlign: "center" },
});
