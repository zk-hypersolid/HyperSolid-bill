import { OrdersService } from "./ordersData";
import type { OrdersInfoLike, RawOpenOrder } from "../lib/hyperliquid/types";

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

class FakeOrdersInfo implements OrdersInfoLike {
  openOrders = jest.fn(async (_a: string): Promise<RawOpenOrder[]> => [
    openOrder({ oid: 1, side: "B" }),
    openOrder({ oid: 1, side: "B" }), // duplicate oid
    openOrder({ oid: 2, side: "A", cloid: ("0x" + "a".repeat(32)) as `0x${string}` }),
  ]);
}

describe("OrdersService", () => {
  it("loads + normalizes open orders, deduped by oid", async () => {
    const info = new FakeOrdersInfo();
    const out = await new OrdersService(info).loadOpenOrders("0xabc");
    expect(info.openOrders).toHaveBeenCalledWith("0xabc");
    expect(out.map((o) => o.oid)).toEqual([1, 2]);
    expect(out[0].side).toBe("buy");
    expect(out[1].side).toBe("sell");
    expect(out[1].cloid).toBe("0x" + "a".repeat(32));
  });
});
