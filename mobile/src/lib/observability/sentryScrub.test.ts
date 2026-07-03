import { scrubEvent, redactAddress } from "./sentryScrub";

describe("redactAddress", () => {
  it("shortens an 0x address to a head…tail form", () => {
    expect(redactAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
  });
});

describe("scrubEvent", () => {
  it("removes key material from extra/contexts and redacts addresses", () => {
    const event = {
      extra: {
        privateKey: "0xdeadbeef",
        mnemonic: "test test test",
        signature: "0xsig",
        address: "0x1234567890abcdef1234567890abcdef12345678",
        note: "keep me",
      },
    };
    const out = scrubEvent(event) as { extra: Record<string, unknown> };
    expect(out.extra.privateKey).toBeUndefined();
    expect(out.extra.mnemonic).toBeUndefined();
    expect(out.extra.signature).toBeUndefined();
    expect(out.extra.address).toBe("0x1234…5678");
    expect(out.extra.note).toBe("keep me");
  });
  it("passes through an event with no sensitive fields", () => {
    expect(scrubEvent({ message: "hi" })).toEqual({ message: "hi" });
  });
  it("is null-safe", () => {
    expect(scrubEvent(null)).toBeNull();
  });
});

describe("scrubEvent (arrays)", () => {
  it("drops key material nested inside an array of objects", () => {
    const event = { extra: { orders: [{ privateKey: "0xdead", coin: "ETH" }, { mnemonic: "a b c", coin: "BTC" }] } };
    const out = scrubEvent(event) as { extra: { orders: Array<Record<string, unknown>> } };
    expect(out.extra.orders[0].privateKey).toBeUndefined();
    expect(out.extra.orders[0].coin).toBe("ETH");
    expect(out.extra.orders[1].mnemonic).toBeUndefined();
    expect(out.extra.orders[1].coin).toBe("BTC");
  });
  it("redacts address strings inside an array under an address key", () => {
    const event = { extra: { addresses: ["0x1234567890abcdef1234567890abcdef12345678"] } };
    const out = scrubEvent(event) as { extra: { addresses: string[] } };
    expect(out.extra.addresses[0]).toBe("0x1234…5678");
  });
  it("recurses into nested arrays", () => {
    const event = { extra: { groups: [[{ seed: "x", ok: 1 }]] } };
    const out = scrubEvent(event) as { extra: { groups: Array<Array<Record<string, unknown>>> } };
    expect(out.extra.groups[0][0].seed).toBeUndefined();
    expect(out.extra.groups[0][0].ok).toBe(1);
  });
});
