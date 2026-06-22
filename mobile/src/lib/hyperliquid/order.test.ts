import {
  roundSize,
  stripTrailingZeros,
  formatPrice,
  validateOrder,
  rejectionMessage,
  normalizeOrderStatus,
  REJECTION_MESSAGES,
  STATUS_MESSAGES,
} from "./order";

describe("roundSize", () => {
  it("rounds to szDecimals", () => {
    expect(roundSize(1.23456789, 5)).toBe(1.23457);
    expect(roundSize(1.23456789, 2)).toBe(1.23);
  });
});

describe("stripTrailingZeros", () => {
  it("removes trailing zeros and dangling dot", () => {
    expect(stripTrailingZeros("1.2300")).toBe("1.23");
    expect(stripTrailingZeros("100.000")).toBe("100");
    expect(stripTrailingZeros("100")).toBe("100");
  });
});

describe("formatPrice", () => {
  it("allows integer prices verbatim", () => {
    expect(formatPrice(123456, 5)).toBe("123456");
  });
  it("limits to ≤5 significant figures", () => {
    // szDecimals 0 -> maxDecimals 6; 5 sig figs binds
    expect(formatPrice(1.234567, 0)).toBe("1.2346");
  });
  it("respects perp max decimals = 6 - szDecimals", () => {
    // szDecimals 5 -> maxDecimals 1
    expect(formatPrice(0.123456, 5)).toBe("0.1");
  });
  it("strips trailing zeros", () => {
    expect(formatPrice(2.5, 4)).toBe("2.5");
  });
  it("uses spot max decimals = 8 - szDecimals", () => {
    // spot, szDecimals 5 -> maxDecimals 3; 5 sig figs not binding here
    expect(formatPrice(0.123456, 5, "spot")).toBe("0.123");
  });
  it("spot still caps at 5 significant figures", () => {
    // spot, szDecimals 0 -> maxDecimals 8, but 5 sig figs binds
    expect(formatPrice(1.234567, 0, "spot")).toBe("1.2346");
  });
  it("clamps max decimals to 0 when szDecimals >= base", () => {
    // perp, szDecimals 6 -> maxDecimals 0 -> rounds to integer-ish
    expect(formatPrice(1.49, 6)).toBe("1");
    // spot, szDecimals 8 -> maxDecimals 0
    expect(formatPrice(2.6, 8, "spot")).toBe("3");
  });
});

describe("validateOrder", () => {
  const sz = 5;
  it("accepts a valid order", () => {
    expect(validateOrder({ price: 60000, size: 0.001, szDecimals: sz })).toBeNull();
  });
  it("rejects notional below $10", () => {
    expect(validateOrder({ price: 100, size: 0.05, szDecimals: sz })).toBe("minTradeNtlRejected");
  });
  it("rejects non-positive price/size", () => {
    expect(validateOrder({ price: 0, size: 1, szDecimals: sz })).toBe("priceRejected");
    expect(validateOrder({ price: 100, size: 0, szDecimals: sz })).toBe("sizeRejected");
  });
  it("rejects size that rounds to zero at lot precision", () => {
    expect(validateOrder({ price: 100000, size: 0.0000001, szDecimals: 2 })).toBe("sizeRejected");
  });
});

describe("rejectionMessage", () => {
  it("maps known codes to Chinese", () => {
    expect(rejectionMessage("minTradeNtlRejected")).toMatch(/\$10/);
    expect(rejectionMessage("badAloPxRejected")).toMatch(/ALO/);
  });
  it("falls back for unknown codes", () => {
    expect(rejectionMessage("weirdCode")).toMatch(/weirdCode/);
  });
});

describe("rejection/status code coverage (spec §4.4)", () => {
  // All §4.4 rejection codes must normalize to a Chinese (non-ASCII) message.
  const rejectionCodes = [
    "tickRejected",
    "minTradeNtlRejected",
    "perpMarginRejected",
    "badAloPxRejected",
    "badTriggerPxRejected",
    "oracleRejected",
    "iocCancelRejected",
    "reduceOnlyRejected",
  ];
  it.each(rejectionCodes)("has a Chinese message for %s", (code) => {
    expect(REJECTION_MESSAGES[code]).toBeDefined();
    expect(REJECTION_MESSAGES[code]).toMatch(/[\u4e00-\u9fa5]/);
  });

  it("covers unknownAsset (used by ExchangeService)", () => {
    expect(rejectionMessage("unknownAsset")).toMatch(/[\u4e00-\u9fa5]/);
    expect(rejectionMessage("unknownAsset")).not.toMatch(/unknownAsset/);
  });

  // §4.4 lifecycle / cancellation statuses must also be Chinese.
  const lifecycleCodes = [
    "open",
    "filled",
    "canceled",
    "triggered",
    "marginCanceled",
    "reduceOnlyCanceled",
    "siblingFilledCanceled",
    "scheduledCancel",
    "openInterestCapCanceled",
    "liquidatedCanceled",
  ];
  it.each(lifecycleCodes)("has a Chinese message for %s", (code) => {
    expect(STATUS_MESSAGES[code]).toBeDefined();
    expect(STATUS_MESSAGES[code]).toMatch(/[\u4e00-\u9fa5]/);
  });
});

describe("normalizeOrderStatus (HL response status -> {kind, message})", () => {
  it("normalizes a resting status (open order)", () => {
    const r = normalizeOrderStatus({ resting: { oid: 77738308 } });
    expect(r.kind).toBe("resting");
    expect(r.oid).toBe(77738308);
    expect(r.message).toMatch(/[\u4e00-\u9fa5]/);
  });

  it("normalizes a filled status with size/price/oid", () => {
    const r = normalizeOrderStatus({
      filled: { totalSz: "0.02", avgPx: "1891.4", oid: 77747314, cloid: "0xabc" },
    });
    expect(r.kind).toBe("filled");
    expect(r.totalSz).toBe("0.02");
    expect(r.avgPx).toBe("1891.4");
    expect(r.oid).toBe(77747314);
    expect(r.cloid).toBe("0xabc");
  });

  it("normalizes the documented English $10 error to minTradeNtlRejected", () => {
    const r = normalizeOrderStatus({ error: "Order must have minimum value of $10." });
    expect(r.kind).toBe("rejected");
    expect(r.code).toBe("minTradeNtlRejected");
    expect(r.message).toMatch(/\$10/);
  });

  it("extracts an embedded rejection code from the error string", () => {
    const r = normalizeOrderStatus({ error: "Price rejected: tickRejected" });
    expect(r.kind).toBe("rejected");
    expect(r.code).toBe("tickRejected");
    expect(r.message).toBe(REJECTION_MESSAGES.tickRejected);
  });

  it("keeps the raw message when no known code matches (still rejected)", () => {
    const r = normalizeOrderStatus({ error: "Some brand new error" });
    expect(r.kind).toBe("rejected");
    expect(r.code).toBeUndefined();
    expect(r.message).toBe("Some brand new error");
  });

  it("classifies waitingForFill / waitingForTrigger as waiting", () => {
    expect(normalizeOrderStatus({ waitingForFill: {} }).kind).toBe("waiting");
    expect(normalizeOrderStatus({ waitingForTrigger: {} }).kind).toBe("waiting");
  });

  it("maps a bare status string to its kind + Chinese message", () => {
    expect(normalizeOrderStatus("marginCanceled").kind).toBe("canceled");
    expect(normalizeOrderStatus("marginCanceled").message).toMatch(/[\u4e00-\u9fa5]/);
    expect(normalizeOrderStatus("tickRejected").kind).toBe("rejected");
  });

  it("returns unknown for unrecognized shapes", () => {
    expect(normalizeOrderStatus({ somethingElse: 1 }).kind).toBe("unknown");
    expect(normalizeOrderStatus(null).kind).toBe("unknown");
    expect(normalizeOrderStatus("totallyUnknownCode").kind).toBe("unknown");
  });
});
