import React, { useMemo } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { MarketsScreen } from "./src/screens/MarketsScreen";
import { useLiveMarkets } from "./src/hooks/useLiveMarkets";
import { MarketDataService } from "./src/services/marketData";
import { createInfoClient, createSubsClient } from "./src/lib/hyperliquid/client";
import { useEnvStore } from "./src/state/envStore";
import { themes, defaultTheme } from "./src/theme/tokens";

export default function App() {
  const network = useEnvStore((s) => s.network);
  const theme = themes[defaultTheme];
  const service = useMemo(
    () => new MarketDataService(createInfoClient(network), createSubsClient(network)),
    [network],
  );
  useLiveMarkets(service);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style="light" />
      <MarketsScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
