import { useThemeStore } from "./themeStore";

describe("themeStore", () => {
  beforeEach(() => useThemeStore.setState({ name: "electrum" }));

  it("defaults to electrum", () => {
    expect(useThemeStore.getState().name).toBe("electrum");
  });

  it("switches theme", () => {
    useThemeStore.getState().setTheme("daylight");
    expect(useThemeStore.getState().name).toBe("daylight");
    useThemeStore.getState().setTheme("oscilloscope");
    expect(useThemeStore.getState().name).toBe("oscilloscope");
  });
});
