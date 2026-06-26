import React from "react";
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from "react-native";
import type { ThemeTokens } from "../theme/tokens";
import { fonts } from "../theme/fonts";

export interface SheetOption<T extends string> {
  value: T;
  label: string;
  subtitle?: string;
}
export interface SheetSection<T extends string> {
  header?: string;
  options: SheetOption<T>[];
}

/**
 * Bottom-sheet single-select: slides up from the bottom with grouped option cards (optional section
 * headers + subtitles), the active one outlined in the brand colour. Used for the order-type and
 * size-unit pickers. Each option's testID is `${testIDPrefix}-opt-${value}`.
 */
export function SheetSelect<T extends string>({
  visible,
  onClose,
  title,
  sections,
  value,
  onSelect,
  theme,
  testIDPrefix,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  sections: SheetSection<T>[];
  value: T;
  onSelect: (v: T) => void;
  theme: ThemeTokens;
  testIDPrefix?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.scrim }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.bg, borderColor: theme.line }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: theme.line }]} />
          {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : null}
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {sections.map((section, si) => (
              <View key={section.header ?? si}>
                {section.header ? (
                  <Text style={[styles.sectionHeader, { color: theme.muted }]}>{section.header}</Text>
                ) : null}
                {section.options.map((o) => {
                  const active = o.value === value;
                  return (
                    <Pressable
                      key={o.value}
                      testID={testIDPrefix ? `${testIDPrefix}-opt-${o.value}` : undefined}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        onSelect(o.value);
                        onClose();
                      }}
                      style={[
                        styles.card,
                        { borderColor: active ? theme.brand : theme.line, backgroundColor: theme.surface },
                      ]}
                    >
                      <Text style={[styles.cardLabel, { color: active ? theme.brand : theme.text }]}>{o.label}</Text>
                      {o.subtitle ? <Text style={[styles.cardSub, { color: theme.muted }]}>{o.subtitle}</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
    maxHeight: "82%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  title: { fontFamily: fonts.display.bold, fontSize: 18, marginBottom: 14 },
  sectionHeader: { fontFamily: fonts.body.medium, fontSize: 12, marginTop: 6, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16, marginBottom: 10 },
  cardLabel: { fontFamily: fonts.display.bold, fontSize: 16 },
  cardSub: { fontFamily: fonts.body.regular, fontSize: 12.5, marginTop: 4 },
});
