import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Orderbook } from "../lib/hyperliquid/types";
import type { ThemeTokens } from "../theme/tokens";
import { useT } from "../i18n/useT";
import { formatPrice } from "./PriceText";
import { fonts } from "../theme/fonts";

/**
 * Order book ladder: cumulative-depth asks/bids around a prominent mid price (HL style). `compact`
 * drops the cumulative-sum column; `sizeInQuote` shows each level's notional (px×sz) in USDC instead
 * of base size; `onPickPrice` makes rows tappable to fill a price.
 */
export function OrderbookView({
  book,
  theme,
  coin,
  compact = false,
  depth = 8,
  askDepth,
  bidDepth,
  sizeInQuote = false,
  midColor,
  onPickPrice,
}: {
  book: Orderbook;
  theme: ThemeTokens;
  coin?: string;
  compact?: boolean;
  depth?: number;
  askDepth?: number;
  bidDepth?: number;
  sizeInQuote?: boolean;
  midColor?: string;
  onPickPrice?: (px: number) => void;
}) {
  const t = useT();
  // Cumulative totals accumulate floating-point noise (e.g. 18.68313000000000002); round to a clean
  // 5-decimal display value.
  const fmtSz = (n: number) => String(Math.round(n * 1e5) / 1e5);
  const fmtQuote = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const sizeOf = (px: number, sz: number) => (sizeInQuote ? fmtQuote(px * sz) : fmtSz(sz));
  const maxTotal = Math.max(
    book.bids[book.bids.length - 1]?.total ?? 1,
    book.asks[book.asks.length - 1]?.total ?? 1,
    1,
  );
  const mid = book.asks[0] && book.bids[0] ? (book.asks[0].px + book.bids[0].px) / 2 : 0;
  const rows = (side: "bid" | "ask") => {
    const levels = side === "bid" ? book.bids : book.asks;
    const limit = side === "bid" ? bidDepth ?? depth : askDepth ?? depth;
    const color = side === "bid" ? theme.up : theme.down;
    return levels.slice(0, limit).map((l, i) => (
      <Pressable
        key={`${side}-${i}`}
        style={styles.row}
        disabled={!onPickPrice}
        onPress={() => onPickPrice?.(l.px)}
        accessibilityRole={onPickPrice ? "button" : undefined}
      >
        <View style={[styles.depth, { backgroundColor: color, opacity: 0.12, width: `${(l.total / maxTotal) * 100}%` }]} />
        <Text style={[styles.cell, styles.price, { color }]}>{l.px}</Text>
        <Text style={[styles.cell, styles.num, { color: theme.text }]}>{sizeOf(l.px, l.sz)}</Text>
        {compact ? null : <Text style={[styles.cell, styles.num, { color: theme.muted }]}>{fmtSz(l.total)}</Text>}
      </Pressable>
    ));
  };
  const sizeHead = sizeInQuote ? `${t("orderbook.size")} (USDC)` : coin ? `${t("orderbook.size")} (${coin})` : t("orderbook.size");
  return (
    <View>
      <View style={styles.head}>
        <Text style={[styles.h, styles.price, { color: theme.muted }]}>{t("orderbook.price")}</Text>
        <Text style={[styles.h, styles.num, { color: theme.muted }]}>{sizeHead}</Text>
        {compact ? null : <Text style={[styles.h, styles.num, { color: theme.muted }]}>{t("orderbook.sum")}</Text>}
      </View>
      {rows("ask")}
      <View style={styles.midBox}>
        <Text style={[styles.midPx, { color: midColor ?? theme.text }]}>{mid > 0 ? formatPrice(mid) : "—"}</Text>
        <Text style={[styles.spread, { color: theme.muted }]}>
          {t("orderbook.spread", { spread: book.spread.toFixed(2), pct: book.spreadPct.toFixed(3) })}
        </Text>
      </View>
      {rows("bid")}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", paddingVertical: 4 },
  h: { fontSize: 10 },
  row: { flexDirection: "row", paddingVertical: 2, position: "relative" },
  depth: { position: "absolute", right: 0, top: 0, bottom: 0, borderRadius: 2 },
  cell: { flex: 1, fontSize: 12, fontVariant: ["tabular-nums"] },
  price: { flex: 1, textAlign: "left" },
  num: { flex: 1, textAlign: "right" },
  midBox: { alignItems: "center", paddingVertical: 6 },
  midPx: { fontFamily: fonts.mono.bold, fontSize: 18, fontVariant: ["tabular-nums"] },
  spread: { fontSize: 10.5, marginTop: 1 },
});
