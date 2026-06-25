import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import type { ThemeTokens } from "../theme/tokens";
import type { MarketTicker, Orderbook, Subscription } from "../lib/hyperliquid/types";
import { fonts } from "../theme/fonts";
import { useT } from "../i18n/useT";
import { DetailDataService } from "../services/detailData";
import { createDetailInfoClient, createDetailSubsClient } from "../lib/hyperliquid/client";
import { bookImbalance } from "../lib/hyperliquid/bookImbalance";
import { groupOrderbook } from "../lib/hyperliquid/orderbookGroup";
import { formatFundingPct } from "../lib/hyperliquid/format";
import { fundingCountdown } from "../lib/hyperliquid/fundingClock";
import { OrderbookView } from "./OrderbookView";
import { BookImbalanceBar } from "./BookImbalanceBar";
import { Dropdown } from "./Dropdown";

/**
 * Right-column live order book for the Trade ticket: funding rate + settlement countdown, an
 * 8-level book (tap a price to fill the limit field), and a bid/ask imbalance bar. Subscribes to
 * the L2 feed for the active coin; lighter than useLiveDetail (no candles/trades).
 */
export function OrderBookPanel({
  theme,
  coin,
  network,
  ticker,
  onPickPrice,
}: {
  theme: ThemeTokens;
  coin: string;
  network: "mainnet" | "testnet";
  ticker?: MarketTicker;
  onPickPrice?: (px: number) => void;
}) {
  const t = useT();
  const service = useMemo(
    () => new DetailDataService(createDetailInfoClient(network), createDetailSubsClient(network)),
    [network],
  );
  const [orderbook, setOrderbook] = useState<Orderbook | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let sub: Subscription | null = null;
    let cancelled = false;
    setOrderbook(null);
    service
      .subscribeOrderbook(coin, setOrderbook)
      .then((s) => {
        if (cancelled) void s.unsubscribe();
        else sub = s;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      sub?.unsubscribe().catch(() => {});
    };
  }, [service, coin]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const imbalance = orderbook ? bookImbalance(orderbook, 10) : { bidPct: 50, askPct: 50 };

  const [sizeInQuote, setSizeInQuote] = useState(true);
  const [tick, setTick] = useState(0);

  const mid = useMemo(() => {
    if (!orderbook || orderbook.asks.length === 0 || orderbook.bids.length === 0) return 0;
    return (orderbook.asks[0].px + orderbook.bids[0].px) / 2;
  }, [orderbook]);

  const tickOptions = useMemo(() => {
    if (mid <= 0) return [{ value: "0", label: t("trade.bookTickNative"), tick: 0 }];
    const base = Math.pow(10, Math.floor(Math.log10(mid)) - 3);
    const fmt = (n: number) => (n < 1 ? n.toPrecision(1) : String(Math.round(n)));
    return [
      { value: "0", label: t("trade.bookTickNative"), tick: 0 },
      { value: "1", label: fmt(base), tick: base },
      { value: "2", label: fmt(base * 10), tick: base * 10 },
      { value: "3", label: fmt(base * 100), tick: base * 100 },
    ];
  }, [mid, t]);

  const tickValue = useMemo(() => {
    const found = tickOptions.find((o) => o.tick === tick);
    return found ? found.value : "0";
  }, [tickOptions, tick]);

  const shownBook = useMemo(() => (orderbook ? groupOrderbook(orderbook, tick) : null), [orderbook, tick]);
  const midColor = ticker ? (ticker.changePct >= 0 ? theme.up : theme.down) : undefined;

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.funding}>
          <Text style={[styles.fundingLabel, { color: theme.muted }]}>{t("trade.fundingRate")}</Text>
          <Text style={[styles.fundingValue, { color: theme.text }]}>
            {`${ticker ? formatFundingPct(ticker.funding) : "—"} · ${fundingCountdown(now)}`}
          </Text>
        </View>
        <Pressable
          testID="book-size-unit"
          onPress={() => setSizeInQuote((v) => !v)}
          hitSlop={6}
          style={[styles.unitBtn, { borderColor: theme.line }]}
        >
          <Text style={[styles.unitText, { color: theme.muted }]}>{sizeInQuote ? "USDC" : coin}</Text>
        </Pressable>
      </View>
      {shownBook ? (
        <>
          <OrderbookView
            book={shownBook}
            theme={theme}
            coin={coin}
            compact
            depth={9}
            sizeInQuote={sizeInQuote}
            midColor={midColor}
            onPickPrice={onPickPrice}
          />
          <View style={styles.imbalance}>
            <BookImbalanceBar theme={theme} bidPct={imbalance.bidPct} askPct={imbalance.askPct} compact />
          </View>
          <View style={styles.bottomRow}>
            <Text style={[styles.hint, { color: theme.faint }]} numberOfLines={2}>
              {t("trade.tapPriceHint")}
            </Text>
            <Dropdown
              testID="book-tick"
              value={tickValue}
              prefix={t("trade.bookGroupPrefix")}
              compact
              options={tickOptions.map((o) => ({ value: o.value, label: o.label }))}
              onChange={(v) => {
                const found = tickOptions.find((o) => o.value === v);
                setTick(found ? found.tick : 0);
              }}
            />
          </View>
        </>
      ) : (
        <ActivityIndicator color={theme.brand} style={styles.loading} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  funding: { flex: 1 },
  fundingLabel: { fontFamily: fonts.body.regular, fontSize: 10, marginBottom: 2 },
  fundingValue: { fontFamily: fonts.mono.medium, fontSize: 11.5 },
  unitBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2.5 },
  unitText: { fontFamily: fonts.mono.medium, fontSize: 10 },
  imbalance: { marginTop: 8 },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, zIndex: 30 },
  hint: { flex: 1, fontFamily: fonts.body.regular, fontSize: 9.5, lineHeight: 12, marginRight: 6 },
  loading: { marginTop: 30 },
});
