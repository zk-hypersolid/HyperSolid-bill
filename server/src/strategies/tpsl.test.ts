// server/src/strategies/tpsl.test.ts
import { tpslTriggered, closeSide } from "./tpsl";
import type { TpslParams } from "./types";

describe("tpsl", () => {
  const tp: TpslParams = { coin: "BTC", takeProfitPrice: 110 };
  const sl: TpslParams = { coin: "BTC", stopLossPrice: 90 };
  const both: TpslParams = { coin: "BTC", takeProfitPrice: 110, stopLossPrice: 90 };

  it("long: take-profit fires when mark >= tp", () => {
    expect(tpslTriggered(tp, +1, 110)).toBe(true);
    expect(tpslTriggered(tp, +1, 109)).toBe(false);
  });
  it("long: stop-loss fires when mark <= sl", () => {
    expect(tpslTriggered(sl, +1, 90)).toBe(true);
    expect(tpslTriggered(sl, +1, 91)).toBe(false);
  });
  it("short: take-profit fires when mark <= tp", () => {
    expect(tpslTriggered(tp, -1, 110)).toBe(true);
    expect(tpslTriggered(tp, -1, 111)).toBe(false);
  });
  it("short: stop-loss fires when mark >= sl", () => {
    expect(tpslTriggered(sl, -1, 90)).toBe(true);
    expect(tpslTriggered(sl, -1, 89)).toBe(false);
  });
  it("both levels: either side triggers", () => {
    expect(tpslTriggered(both, +1, 110)).toBe(true);
    expect(tpslTriggered(both, +1, 90)).toBe(true);
    expect(tpslTriggered(both, +1, 100)).toBe(false);
  });
  it("flat position never triggers", () => {
    expect(tpslTriggered(both, 0, 110)).toBe(false);
  });
  it("closeSide is opposite the position", () => {
    expect(closeSide(+1)).toBe("sell");
    expect(closeSide(-1)).toBe("buy");
  });
});
