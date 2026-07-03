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
