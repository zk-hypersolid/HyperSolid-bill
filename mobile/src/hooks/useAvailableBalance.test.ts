import { renderHook, waitFor } from "@testing-library/react-native";
import { useAvailableBalance } from "./useAvailableBalance";
import type { PositionsService } from "../services/positionsData";

const svc = {
  loadPortfolio: jest.fn(async () => ({
    summary: { accountValue: 1000, totalNtlPos: 0, totalMarginUsed: 0, withdrawable: 800, totalUnrealizedPnl: 0 },
    positions: [],
  })),
} as unknown as PositionsService;

describe("useAvailableBalance", () => {
  it("returns the withdrawable balance for a valid address", async () => {
    const { result } = renderHook(() => useAvailableBalance(svc, "0x" + "a".repeat(40)));
    await waitFor(() => expect(result.current).toBe(800));
  });

  it("returns null for an invalid address and never fetches", () => {
    const { result } = renderHook(() => useAvailableBalance(svc, "0xabc"));
    expect(result.current).toBeNull();
  });
});
