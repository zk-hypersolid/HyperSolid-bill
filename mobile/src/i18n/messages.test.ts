import { messages, type Locale } from "./messages";

describe("i18n messages", () => {
  const locales: Locale[] = ["en", "zh"];

  it("has identical key sets across all locales (no missing translations)", () => {
    const enKeys = Object.keys(messages.en).sort();
    for (const loc of locales) {
      expect(Object.keys(messages[loc]).sort()).toEqual(enKeys);
    }
  });

  it("has a non-empty string for every key in every locale", () => {
    for (const loc of locales) {
      for (const [key, val] of Object.entries(messages[loc])) {
        expect(typeof val).toBe("string");
        expect(val.length).toBeGreaterThan(0);
      }
    }
  });

  it("translates the order book headers per locale", () => {
    expect(messages.en["orderbook.price"]).toBe("PRICE");
    expect(messages.zh["orderbook.price"]).toBe("价格");
    expect(messages.en["orderbook.size"]).toBe("SIZE");
    expect(messages.zh["orderbook.size"]).toBe("数量");
  });

  it("carries the language switch labels", () => {
    expect(messages.en["lang.en"]).toBe("English");
    expect(messages.en["lang.zh"]).toBe("中文");
  });
});
