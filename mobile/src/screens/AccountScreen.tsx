import React from "react";
import { BoardPlaceholder } from "../components/BoardPlaceholder";
import { useTheme } from "../theme/useTheme";

export function AccountScreen() {
  return <BoardPlaceholder title="钱包 Account" subtitle="Passkey 本地 · onboarding · 入金 · 提现 · 设置" theme={useTheme()} />;
}
