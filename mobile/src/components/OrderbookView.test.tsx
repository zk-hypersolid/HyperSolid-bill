import React from "react";
import { act, render, screen } from "@testing-library/react-native";
import { OrderbookView } from "./OrderbookView";
import { themes } from "../theme/tokens";
import { useLocaleStore } from "../state/localeStore";
import type { Orderbook } from "../lib/hyperliquid/types";

const book: Orderbook = {
  bids: [{ px: 100, sz: 1, total: 1 }],
  asks: [{ px: 101, sz: 2, total: 2 }],
  spread: 1,
  spreadPct: 0.99,
} as unknown as Orderbook;

describe("OrderbookView i18n", () => {
  beforeEach(() => act(() => useLocaleStore.getState().setLocale("en")));

  it("renders English headers + spread by default", () => {
    render(<OrderbookView book={book} theme={themes.electrum} />);
    expect(screen.getByText("PRICE")).toBeTruthy();
    expect(screen.getByText("SIZE")).toBeTruthy();
    expect(screen.getByText("Spread 1.00 (0.990%)")).toBeTruthy();
  });

  it("renders Chinese headers + spread after switching locale", () => {
    act(() => useLocaleStore.getState().setLocale("zh"));
    render(<OrderbookView book={book} theme={themes.electrum} />);
    expect(screen.getByText("价格")).toBeTruthy();
    expect(screen.getByText("数量")).toBeTruthy();
    expect(screen.getByText("价差 1.00 (0.990%)")).toBeTruthy();
  });
});
