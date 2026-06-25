import { renderHook, waitFor } from "@testing-library/react-native";
import { useCoinPosition } from "./useCoinPosition";
import type { PositionsService } from "../services/positionsData";
import type { Position } from "../lib/hyperliquid/types";

const btc: Position = {
  coin: "BTC",
  size: 0.5,
  side: "long",
  entryPx: 60000,
  positionValue: 30000,
  unrealizedPnl: 0,
  liquidationPx: 50000,
  marginUsed: 3000,
  leverage: 10,
};

const svc = {
  loadPortfolio: jest.fn(async () => ({
    summary: { accountValue: 1000, totalNtlPos: 0, totalMarginUsed: 0, withdrawable: 800, totalUnrealizedPnl: 0 },
    positions: [btc],
  })),
} as unknown as PositionsService;

describe("useCoinPosition", () => {
  const addr = "0x" + "a".repeat(40);

  it("returns the matching position for the coin (case-insensitive)", async () => {
    const { result } = renderHook(() => useCoinPosition(svc, addr, "btc"));
    await waitFor(() => expect(result.current).toEqual(btc));
  });

  it("returns null when flat in the coin", async () => {
    const { result } = renderHook(() => useCoinPosition(svc, addr, "ETH"));
    await waitFor(() => expect(svc.loadPortfolio).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it("returns null for an invalid address and never fetches", () => {
    const { result } = renderHook(() => useCoinPosition(svc, "0xabc", "BTC"));
    expect(result.current).toBeNull();
  });
});
