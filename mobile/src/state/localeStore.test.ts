import { act, renderHook } from "@testing-library/react-native";
import { useLocaleStore } from "./localeStore";

describe("localeStore", () => {
  beforeEach(() => act(() => useLocaleStore.getState().setLocale("en")));

  it("defaults to en", () => {
    expect(useLocaleStore.getState().locale).toBe("en");
  });

  it("setLocale sets the locale", () => {
    act(() => useLocaleStore.getState().setLocale("zh"));
    expect(useLocaleStore.getState().locale).toBe("zh");
  });

  it("toggleLocale flips en<->zh", () => {
    const { result } = renderHook(() => useLocaleStore((s) => s.locale));
    act(() => useLocaleStore.getState().toggleLocale());
    expect(result.current).toBe("zh");
    act(() => useLocaleStore.getState().toggleLocale());
    expect(result.current).toBe("en");
  });
});
