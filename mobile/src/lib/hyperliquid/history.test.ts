import { normalizeFills, normalizeFundings, normalizeOpenOrders } from "./history";
import type { RawUserFill, RawFunding, RawOpenOrder } from "./types";

const fill = (over: Partial<RawUserFill>): RawUserFill => ({
  coin: "BTC",
  px: "60000",
  sz: "0.01",
  side: "B",
  time: 1000,
  startPosition: "0",
  dir: "Open Long",
  closedPnl: "0",
  hash: ("0x" + "1".repeat(64)) as `0x${string}`,
  oid: 1,
  crossed: true,
  fee: "0.5",
  tid: 100,
  feeToken: "USDC",
  twapId: null,
  ...over,
});

describe("normalizeFills (userFills)", () => {
  it("maps fields, B/A side, builderFee default 0", () => {
    const [f] = normalizeFills([fill({ side: "A", closedPnl: "-1.5", builderFee: "0.1" })]);
    expect(f.side).toBe("sell");
    expect(f.px).toBe(60000);
    expect(f.sz).toBe(0.01);
    expect(f.closedPnl).toBe(-1.5);
    expect(f.fee).toBe(0.5);
    expect(f.builderFee).toBe(0.1);
    const [g] = normalizeFills([fill({})]);
    expect(g.side).toBe("buy");
    expect(g.builderFee).toBe(0); // absent -> 0
  });

  it("dedupes by tid and sorts newest first", () => {
    const out = normalizeFills([
      fill({ tid: 1, time: 100 }),
      fill({ tid: 1, time: 100 }), // duplicate tid
      fill({ tid: 2, time: 300 }),
      fill({ tid: 3, time: 200 }),
    ]);
    expect(out.map((f) => f.tid)).toEqual([2, 3, 1]); // unique, time desc
  });

  it("handles empty input", () => {
    expect(normalizeFills([])).toEqual([]);
  });
});

const funding = (over: Partial<RawFunding["delta"]>, time = 1000): RawFunding => ({
  time,
  hash: ("0x" + "2".repeat(64)) as `0x${string}`,
  delta: { type: "funding", coin: "BTC", usdc: "-0.25", szi: "0.01", fundingRate: "0.0000125", nSamples: 1, ...over },
});

describe("normalizeFundings (userFundings)", () => {
  it("extracts delta fields (signed usdc) and sorts newest first", () => {
    const out = normalizeFundings([
      funding({ coin: "BTC", usdc: "-0.25" }, 100),
      funding({ coin: "ETH", usdc: "0.10" }, 300),
    ]);
    expect(out.map((f) => f.coin)).toEqual(["ETH", "BTC"]); // time desc
    expect(out[1].usdc).toBe(-0.25);
    expect(out[1].fundingRate).toBe(0.0000125);
    expect(out[1].szi).toBe(0.01);
  });

  it("handles empty input", () => {
    expect(normalizeFundings([])).toEqual([]);
  });
});

const openOrder = (over: Partial<RawOpenOrder>): RawOpenOrder => ({
  coin: "BTC",
  side: "B",
  limitPx: "59000",
  sz: "0.01",
  oid: 1,
  timestamp: 1000,
  origSz: "0.02",
  ...over,
});

describe("normalizeOpenOrders (openOrders)", () => {
  it("maps fields, B/A side, cloid null + reduceOnly default false", () => {
    const [o] = normalizeOpenOrders([openOrder({ side: "A" })]);
    expect(o.side).toBe("sell");
    expect(o.limitPx).toBe(59000);
    expect(o.sz).toBe(0.01);
    expect(o.origSz).toBe(0.02);
    expect(o.cloid).toBeNull();
    expect(o.reduceOnly).toBe(false);
    const [r] = normalizeOpenOrders([
      openOrder({ cloid: ("0x" + "a".repeat(32)) as `0x${string}`, reduceOnly: true }),
    ]);
    expect(r.cloid).toBe("0x" + "a".repeat(32));
    expect(r.reduceOnly).toBe(true);
  });

  it("dedupes by oid", () => {
    const out = normalizeOpenOrders([openOrder({ oid: 1 }), openOrder({ oid: 1 }), openOrder({ oid: 2 })]);
    expect(out.map((o) => o.oid)).toEqual([1, 2]);
  });

  it("handles empty input", () => {
    expect(normalizeOpenOrders([])).toEqual([]);
  });
});
