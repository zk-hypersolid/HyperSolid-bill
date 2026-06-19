import React from "react";
import { BoardPlaceholder } from "../components/BoardPlaceholder";
import { useTheme } from "../theme/useTheme";

export function TradeScreen() {
  return <BoardPlaceholder title="交易 Trade" subtitle="下单 · 撤改 · 杠杆 · TP/SL（独立 Tab）" theme={useTheme()} />;
}
