import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useTheme } from "../theme/useTheme";
import { useEnvStore } from "../state/envStore";
import { PositionsService } from "../services/positionsData";
import { createPositionsInfoClient } from "../lib/hyperliquid/client";
import { useViewOnlyPortfolio } from "../hooks/useViewOnlyPortfolio";
import { PositionRow } from "../components/PositionRow";
import { formatCompact } from "../lib/hyperliquid/format";

export function PositionsScreen() {
  const theme = useTheme();
  const network = useEnvStore((s) => s.network);
  const service = useMemo(() => new PositionsService(createPositionsInfoClient(network)), [network]);
  const { portfolio, loading, error, load } = useViewOnlyPortfolio(service);
  const [address, setAddress] = useState("");

  const pnlColor = (portfolio?.summary.totalUnrealizedPnl ?? 0) >= 0 ? theme.up : theme.down;

  return (
    <ScrollView style={[styles.root, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>持仓 Positions</Text>
      <Text style={[styles.banner, { color: theme.muted, borderColor: theme.line }]}>
        👁️ view-only 预览：输入任意地址查看其持仓（零私钥）。连接钱包后将自动填充。
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="0x… 钱包地址"
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: theme.text, borderColor: theme.line, backgroundColor: theme.surface }]}
        />
        <Pressable
          onPress={() => load(address)}
          accessibilityRole="button"
          style={[styles.btn, { backgroundColor: theme.brand }]}
        >
          <Text style={[styles.btnText, { color: theme.bg }]}>查询</Text>
        </Pressable>
      </View>

      {error ? <Text style={[styles.msg, { color: theme.down }]}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={theme.brand} style={{ marginTop: 16 }} /> : null}

      {portfolio ? (
        <>
          <View style={[styles.summary, { borderColor: theme.line }]}>
            <Summary label="账户权益" value={`$${formatCompact(portfolio.summary.accountValue)}`} theme={theme} />
            <Summary label="可提现" value={`$${formatCompact(portfolio.summary.withdrawable)}`} theme={theme} />
            <Summary
              label="未实现盈亏"
              value={`${portfolio.summary.totalUnrealizedPnl >= 0 ? "+" : ""}${portfolio.summary.totalUnrealizedPnl.toFixed(2)}`}
              color={pnlColor}
              theme={theme}
            />
          </View>
          {portfolio.positions.length === 0 ? (
            <Text style={[styles.msg, { color: theme.muted }]}>该地址暂无持仓</Text>
          ) : (
            portfolio.positions.map((p) => <PositionRow key={p.coin} position={p} theme={theme} />)
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

function Summary({
  label,
  value,
  color,
  theme,
}: {
  label: string;
  value: string;
  color?: string;
  theme: { muted: string; text: string };
}) {
  return (
    <View style={styles.summaryCell}>
      <Text style={[styles.summaryLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: color ?? theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 10 },
  banner: { fontSize: 12, lineHeight: 18, borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  inputRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  btn: { paddingHorizontal: 18, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 14, fontWeight: "700" },
  msg: { fontSize: 13, marginTop: 14 },
  summary: { flexDirection: "row", borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 16, marginBottom: 8 },
  summaryCell: { flex: 1 },
  summaryLabel: { fontSize: 10, marginBottom: 3 },
  summaryValue: { fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
