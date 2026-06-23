import { act, renderHook } from "@testing-library/react-native";
import { useT } from "./useT";
import { useLocaleStore } from "../state/localeStore";

describe("useT", () => {
  beforeEach(() => act(() => useLocaleStore.getState().setLocale("en")));

  it("returns the en string by default", () => {
    const { result } = renderHook(() => useT());
    expect(result.current("orderbook.price")).toBe("PRICE");
  });

  it("returns the zh string after switching locale", () => {
    const { result } = renderHook(() => useT());
    act(() => useLocaleStore.getState().setLocale("zh"));
    expect(result.current("orderbook.price")).toBe("价格");
  });

  it("interpolates {var} placeholders", () => {
    const { result } = renderHook(() => useT());
    expect(result.current("orderbook.spread", { spread: "1.00", pct: "0.002" })).toBe("Spread 1.00 (0.002%)");
  });

  it("falls back to the key when a translation is missing", () => {
    const { result } = renderHook(() => useT());
    expect(result.current("does.not.exist" as never)).toBe("does.not.exist");
  });
});
