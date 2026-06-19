import React from "react";
import { BoardPlaceholder } from "../components/BoardPlaceholder";
import { useTheme } from "../theme/useTheme";

export function AgentScreen() {
  return <BoardPlaceholder title="策略 Agent" subtitle="离线自动化 · 护栏 · kill-switch（差异化护城河）" theme={useTheme()} />;
}
