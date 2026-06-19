import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useViewOnlyPortfolio, isValidAddress } from "./useViewOnlyPortfolio";
import type { PositionsService } from "../services/positionsData";
import type { PortfolioSnapshot } from "../lib/hyperliquid/types";

const snapshot: PortfolioSnapshot = {
  summary: { accountValue: 1000, totalNtlPos: 0, totalMarginUsed: 0, withdrawable: 800, totalUnrealizedPnl: 0 },
  positions: [],
};
const VALID = "0x" + "a".repeat(40);

describe("isValidAddress", () => {
  it("accepts a 0x + 40 hex address", () => {
    expect(isValidAddress(VALID)).toBe(true);
  });
  it("rejects malformed addresses", () => {
    expect(isValidAddress("0x123")).toBe(false);
    expect(isValidAddress("nonsense")).toBe(false);
  });
});

describe("useViewOnlyPortfolio", () => {
  it("loads a portfolio for a valid address", async () => {
    const svc = { loadPortfolio: jest.fn(async () => snapshot) } as unknown as PositionsService;
    const { result } = renderHook(() => useViewOnlyPortfolio(svc));
    await act(async () => {
      await result.current.load(VALID);
    });
    await waitFor(() => expect(result.current.portfolio?.summary.accountValue).toBe(1000));
  });

  it("sets an error for an invalid address and does not call the service", async () => {
    const svc = { loadPortfolio: jest.fn() } as unknown as PositionsService;
    const { result } = renderHook(() => useViewOnlyPortfolio(svc));
    await act(async () => {
      await result.current.load("0xbad");
    });
    expect(result.current.error).toMatch(/无效/);
    expect(svc.loadPortfolio).not.toHaveBeenCalled();
  });
});
