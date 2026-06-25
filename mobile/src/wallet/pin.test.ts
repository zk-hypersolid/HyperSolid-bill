import { derivePinVerifier, verifyPin } from "./pin";

describe("pin crypto", () => {
  it("derives a salted PBKDF2 verifier and verifies the correct PIN", () => {
    const v = derivePinVerifier("123456");
    expect(v.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(v.hashHex).toMatch(/^[0-9a-f]{64}$/);
    expect(v.iterations).toBeGreaterThanOrEqual(100000);
    expect(verifyPin("123456", v)).toBe(true);
  });

  it("rejects a wrong PIN", () => {
    const v = derivePinVerifier("123456");
    expect(verifyPin("000000", v)).toBe(false);
    expect(verifyPin("12345", v)).toBe(false);
    expect(verifyPin("1234567", v)).toBe(false);
  });

  it("uses a fresh random salt each time (same PIN → different verifier)", () => {
    const a = derivePinVerifier("424242");
    const b = derivePinVerifier("424242");
    expect(a.salt).not.toBe(b.salt);
    expect(a.hashHex).not.toBe(b.hashHex);
    // both still verify the same PIN
    expect(verifyPin("424242", a)).toBe(true);
    expect(verifyPin("424242", b)).toBe(true);
  });

  it("verification is independent of the stored iteration count", () => {
    const v = derivePinVerifier("987654", undefined, 120000);
    expect(v.iterations).toBe(120000);
    expect(verifyPin("987654", v)).toBe(true);
  });
});
