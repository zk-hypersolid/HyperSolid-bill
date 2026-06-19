import React from "react";
import { BoardPlaceholder } from "../components/BoardPlaceholder";
import { useTheme } from "../theme/useTheme";

export function PositionsScreen() {
  return <BoardPlaceholder title="持仓 Positions" subtitle="账户总览 · 盈亏 · 平减仓 · 历史 · view-only" theme={useTheme()} />;
}
