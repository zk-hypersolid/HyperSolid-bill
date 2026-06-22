import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import { AccountScreen } from "./AccountScreen";
import { useWalletStore } from "../state/walletStore";
import { useEnvStore } from "../state/envStore";
import type { PositionsService } from "../services/positionsData";
import type { FundingsService } from "../services/fundingsData";
import type { PortfolioSnapshot, FundingEvent } from "../lib/hyperliquid/types";

const ADDR = "0x7f3aabcdef0123456789abcdefabcdef0123c2e9";

const portfolio: PortfolioSnapshot = {
  summary: { accountValue: 1000, totalNtlPos: 500, totalMarginUsed: 100, withdrawable: 800, totalUnrealizedPnl: 50 },
  positions: [],
};
const fundingEvents: FundingEvent[] = [
  { coin: "BTC", time: 200, usdc: -0.25, szi: 0.01, fundingRate: 0.0000125, hash: "0x" },
  { coin: "ETH", time: 100, usdc: 0.1, szi: 1, fundingRate: 0.00001, hash: "0x" },
];

const fakeDeps = {
  positions: { loadPortfolio: jest.fn(async () => portfolio) } as unknown as PositionsService,
  fundings: { load: jest.fn(async () => fundingEvents) } as unknown as FundingsService,
};

describe("AccountScreen", () => {
  beforeEach(() => {
    useEnvStore.setState({ network: "mainnet" });
    useWalletStore.setState({ mode: "none", wallet: null, address: null });
    fakeDeps.positions.loadPortfolio = jest.fn(async () => portfolio);
    fakeDeps.fundings.load = jest.fn(async () => fundingEvents);
  });

  it("renders the onboarding state with create / restore / view-only actions", () => {
    render(<AccountScreen />);
    expect(screen.getByText("HYPERSOLID")).toBeTruthy();
    expect(screen.getByText("◷ MAINNET")).toBeTruthy();
    expect(screen.getByText("欢迎使用 HyperSolid")).toBeTruthy();
    expect(screen.getByText("创建本地钱包（推荐）")).toBeTruthy();
    expect(screen.getByText("恢复钱包")).toBeTruthy();
    expect(screen.getByText("以只读模式进入")).toBeTruthy();
    expect(screen.getByPlaceholderText("输入 12 词助记词")).toBeTruthy();
  });

  it("renders the connected state with wallet card and sign-out", () => {
    useWalletStore.setState({ mode: "local", wallet: {} as never, address: ADDR });
    render(<AccountScreen deps={fakeDeps} />);
    expect(screen.getByText("钱包 Account")).toBeTruthy();
    expect(screen.getByText("本地钱包（非托管）")).toBeTruthy();
    expect(screen.getByText("退出 / 切换钱包")).toBeTruthy();
    expect(screen.getByText("网络")).toBeTruthy();
  });

  it("labels the view-only connected state correctly", () => {
    useWalletStore.setState({ mode: "viewOnly", wallet: null, address: "0xabc" });
    render(<AccountScreen deps={fakeDeps} />);
    expect(screen.getByText("仅查看")).toBeTruthy();
  });

  it("loads + shows account summary (margin ratio) and funding total for a connected wallet", async () => {
    useWalletStore.setState({ mode: "local", wallet: {} as never, address: ADDR });
    render(<AccountScreen deps={fakeDeps} />);
    await waitFor(() => expect(fakeDeps.positions.loadPortfolio).toHaveBeenCalledWith(ADDR));
    expect(screen.getByText("账户摘要")).toBeTruthy();
    expect(screen.getByText("保证金率")).toBeTruthy();
    expect(screen.getByText(/10\.0%/)).toBeTruthy(); // 100 / 1000
    expect(screen.getByText("资金费")).toBeTruthy();
    expect(screen.getByText(/-0\.15/)).toBeTruthy(); // total -0.25 + 0.10
  });

  it("does not load for an invalid address (view-only 0xabc)", () => {
    useWalletStore.setState({ mode: "viewOnly", wallet: null, address: "0xabc" });
    render(<AccountScreen deps={fakeDeps} />);
    expect(fakeDeps.positions.loadPortfolio).not.toHaveBeenCalled();
  });
});
