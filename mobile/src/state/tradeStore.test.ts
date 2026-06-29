import { useTradeStore } from "./tradeStore";

describe("tradeStore", () => {
  beforeEach(() => useTradeStore.setState({ selectedCoin: null }));

  it("stores a selected coin uppercased", () => {
    useTradeStore.getState().setSelectedCoin("eth");
    expect(useTradeStore.getState().selectedCoin).toBe("ETH");
  });

  it("clears the selected coin", () => {
    useTradeStore.getState().setSelectedCoin("SOL");
    useTradeStore.getState().clearSelectedCoin();
    expect(useTradeStore.getState().selectedCoin).toBeNull();
  });
});
