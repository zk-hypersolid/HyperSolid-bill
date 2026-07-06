import { makeShadowVerifier, SHADOW_NONCE } from "./signerShadow";

// Mock the @nktkas/hyperliquid/signing module
jest.mock("@nktkas/hyperliquid/signing", () => ({
  createL1ActionHash: jest.fn((args: { action: unknown; nonce: number }) => {
    // Return a deterministic hash based on the action for testing
    const action = args.action as { type: string; orders?: unknown[]; grouping?: string };
    if (action.type === "order" && action.orders && action.orders.length > 0) {
      const o = action.orders[0] as Record<string, unknown>;
      // This hash must match what expectedLocalHash() returns
      if (o.a === 0 && o.b === true && o.p === "50000" && o.s === "0.01" && o.r === false) {
        return "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      }
    }
    return "0x0000000000000000000000000000000000000000000000000000000000000000";
  }),
}));

const orderParams = { asset: 0, isBuy: true, px: "50000", sz: "0.01", reduceOnly: false, tif: "Ioc", grouping: "na", cloid: "0x00000000000000000000000000000000000000000000000000000000000001" };

function expectedLocalHash(): string {
  return "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
}

const flush = () => new Promise((r) => setImmediate(r));

function fetchReturning(hash: string, ok = true, status = 200) {
  return jest.fn(async () => ({ ok, status, json: async () => ({ actionHash: hash }) }));
}

describe("makeShadowVerifier", () => {
  it("no warn when hashes match", async () => {
    const warn = jest.fn();
    const f = fetchReturning(expectedLocalHash());
    const verify = makeShadowVerifier({ url: "http://x", fetchImpl: f as never, logger: { warn, debug: jest.fn() } });
    verify("order", orderParams);
    await flush();
    expect(f).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns on mismatch", async () => {
    const warn = jest.fn();
    const f = fetchReturning("0xdeadbeef");
    const verify = makeShadowVerifier({ url: "http://x", fetchImpl: f as never, logger: { warn, debug: jest.fn() } });
    verify("order", orderParams);
    await flush();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("swallows fetch rejection", async () => {
    const warn = jest.fn();
    const f = jest.fn(async () => { throw new Error("network"); });
    const verify = makeShadowVerifier({ url: "http://x", fetchImpl: f as never, logger: { warn, debug: jest.fn() } });
    expect(() => verify("order", orderParams)).not.toThrow();
    await flush();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("no-op for unsupported kind (no fetch)", async () => {
    const f = fetchReturning("0x00");
    const verify = makeShadowVerifier({ url: "http://x", fetchImpl: f as never });
    verify("updateLeverage", { asset: 0, isCross: true, leverage: 5 });
    await flush();
    expect(f).not.toHaveBeenCalled();
  });
});
