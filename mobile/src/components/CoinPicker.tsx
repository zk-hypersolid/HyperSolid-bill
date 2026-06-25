import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Modal, TextInput, FlatList, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { useT } from "../i18n/useT";
import { fonts } from "../theme/fonts";
import { Icon } from "./Icon";
import type { MarketTicker } from "../lib/hyperliquid/types";

/** Searchable coin picker modal, sourced from the live market list (volume-ordered). */
export function CoinPicker({
  visible,
  tickers,
  onSelect,
  onClose,
}: {
  visible: boolean;
  tickers: MarketTicker[];
  onSelect: (coin: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return q ? tickers.filter((tk) => tk.coin.toUpperCase().includes(q)) : tickers;
  }, [tickers, query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.scrim }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.bg, borderColor: theme.line }]} onPress={() => {}}>
          <View style={styles.handle}>
            <View style={[styles.grip, { backgroundColor: theme.lineStrong }]} />
          </View>
          <View style={[styles.search, { borderColor: theme.line, backgroundColor: theme.surface }]}>
            <Icon name="search" color={theme.faint} size={16} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("trade.searchMarket")}
              placeholderTextColor={theme.faint}
              autoCapitalize="characters"
              autoCorrect={false}
              testID="coin-picker-search"
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.coin}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                testID={`coin-opt-${item.coin}`}
                accessibilityRole="button"
                onPress={() => {
                  onSelect(item.coin);
                  setQuery("");
                  onClose();
                }}
                style={({ pressed }) => [styles.row, { borderBottomColor: theme.line, backgroundColor: pressed ? theme.surface : "transparent" }]}
              >
                <Text style={[styles.coin, { color: theme.text }]}>{item.coin}-USDC</Text>
                <Text style={[styles.chg, { color: item.changePct >= 0 ? theme.up : theme.down }]}>
                  {`${item.changePct >= 0 ? "+" : ""}${item.changePct.toFixed(2)}%`}
                </Text>
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { height: "70%", borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, paddingHorizontal: 14 },
  handle: { alignItems: "center", paddingVertical: 10 },
  grip: { width: 40, height: 4, borderRadius: 2 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8 },
  searchInput: { flex: 1, fontFamily: fonts.mono.medium, fontSize: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1 },
  coin: { fontFamily: fonts.display.bold, fontSize: 14 },
  chg: { fontFamily: fonts.mono.medium, fontSize: 13 },
});
