import React, { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import type { ThemeTokens } from "../theme/tokens";
import { fonts } from "../theme/fonts";
import { useT } from "../i18n/useT";

/** Leverage choices offered for a market, capped at its max (always includes the max). */
export function leverageChoices(maxLeverage: number): number[] {
  const base = [1, 2, 5, 10, 20, 50, 100].filter((l) => l < maxLeverage);
  return [...base, maxLeverage].filter((l, i, a) => a.indexOf(l) === i);
}

/** HL-style top bar: a margin-mode pill (Cross/Isolated) and a leverage pill that opens a chooser. */
export function MarginLeverageBar({
  theme,
  isCross,
  onToggleCross,
  leverage,
  maxLeverage,
  onSetLeverage,
}: {
  theme: ThemeTokens;
  isCross: boolean;
  onToggleCross: () => void;
  leverage: number;
  maxLeverage: number;
  onSetLeverage: (lev: number) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const choices = leverageChoices(maxLeverage);
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        testID="margin-mode"
        onPress={onToggleCross}
        style={[styles.pill, { borderColor: theme.line, backgroundColor: theme.surface }]}
      >
        <Text style={[styles.pillText, { color: theme.text }]}>{isCross ? t("trade.cross") : t("trade.isolated")}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        testID="leverage-pill"
        onPress={() => setOpen(true)}
        style={[styles.pill, { borderColor: theme.line, backgroundColor: theme.surface }]}
      >
        <Text style={[styles.pillText, { color: theme.text }]}>{`${leverage}x`}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.scrim }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.bg, borderColor: theme.line }]} onPress={() => {}}>
            <Text style={[styles.sheetTitle, { color: theme.muted }]}>{t("trade.leverageMax", { max: maxLeverage })}</Text>
            <View style={styles.chips}>
              {choices.map((l) => (
                <Pressable
                  key={l}
                  accessibilityRole="button"
                  testID={`leverage-opt-${l}`}
                  onPress={() => {
                    onSetLeverage(l);
                    setOpen(false);
                  }}
                  style={[
                    styles.chip,
                    { borderColor: l === leverage ? theme.brand : theme.line, backgroundColor: l === leverage ? theme.brand : "transparent" },
                  ]}
                >
                  <Text style={[styles.chipText, { color: l === leverage ? theme.bg : theme.text }]}>{`${l}x`}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginBottom: 12 },
  pill: { flex: 1, alignItems: "center", paddingVertical: 10, borderWidth: 1, borderRadius: 10 },
  pillText: { fontFamily: fonts.display.bold, fontSize: 13.5 },
  backdrop: { flex: 1, justifyContent: "center", padding: 28 },
  sheet: { borderWidth: 1, borderRadius: 16, padding: 18 },
  sheetTitle: { fontFamily: fonts.body.regular, fontSize: 11, marginBottom: 12, textAlign: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  chip: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 16, paddingVertical: 10 },
  chipText: { fontFamily: fonts.mono.bold, fontSize: 14 },
});
