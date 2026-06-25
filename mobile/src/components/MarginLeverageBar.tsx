import React, { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import type { ThemeTokens } from "../theme/tokens";
import { fonts } from "../theme/fonts";
import { useT } from "../i18n/useT";
import { Slider } from "./Slider";

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
  // Map the 0–100% slider onto the 1×–max× range and apply live.
  const sliderPct = maxLeverage > 1 ? ((leverage - 1) / (maxLeverage - 1)) * 100 : 0;
  function onSlide(pct: number) {
    const lev = Math.max(1, Math.min(maxLeverage, Math.round(1 + (pct / 100) * (maxLeverage - 1))));
    onSetLeverage(lev);
  }
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
      <View
        accessibilityRole="text"
        testID="position-mode"
        style={[styles.pill, styles.pillInfo, { borderColor: theme.line }]}
      >
        <Text style={[styles.pillText, { color: theme.muted }]}>{t("trade.oneWay")}</Text>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.scrim }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.bg, borderColor: theme.line }]} onPress={() => {}}>
            <Text style={[styles.sheetTitle, { color: theme.muted }]}>{t("trade.leverageMax", { max: maxLeverage })}</Text>
            <View style={styles.sliderRow}>
              <View style={styles.sliderWrap}>
                <Slider value={sliderPct} onChange={onSlide} testID="leverage-slider" />
              </View>
              <View style={[styles.levBox, { borderColor: theme.lineStrong, backgroundColor: theme.surface }]}>
                <Text style={[styles.levBoxNum, { color: theme.text }]}>{leverage}</Text>
                <Text style={[styles.levBoxX, { color: theme.muted }]}>x</Text>
              </View>
            </View>
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
            <Pressable
              accessibilityRole="button"
              testID="leverage-confirm"
              onPress={() => setOpen(false)}
              style={[styles.confirm, { backgroundColor: theme.brand }]}
            >
              <Text style={[styles.confirmText, { color: theme.bg }]}>{t("common.confirm")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginBottom: 12 },
  pill: { flex: 1, alignItems: "center", paddingVertical: 10, borderWidth: 1, borderRadius: 10 },
  pillInfo: { borderStyle: "dashed" },
  pillText: { fontFamily: fonts.display.bold, fontSize: 13.5 },
  backdrop: { flex: 1, justifyContent: "center", padding: 28 },
  sheet: { borderWidth: 1, borderRadius: 16, padding: 18 },
  sheetTitle: { fontFamily: fonts.body.regular, fontSize: 11, marginBottom: 12, textAlign: "center" },
  sliderRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  sliderWrap: { flex: 1 },
  levBox: { flexDirection: "row", alignItems: "baseline", gap: 3, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  levBoxNum: { fontFamily: fonts.mono.bold, fontSize: 18 },
  levBoxX: { fontFamily: fonts.mono.medium, fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 16 },
  chip: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 16, paddingVertical: 10 },
  chipText: { fontFamily: fonts.mono.bold, fontSize: 14 },
  confirm: { paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  confirmText: { fontFamily: fonts.display.bold, fontSize: 15 },
});
