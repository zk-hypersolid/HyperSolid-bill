import { deriveKey, seal, open } from "./secretBox";

describe("secretBox (AES-256-GCM)", () => {
  const key = deriveKey("a-strong-server-secret");

  it("round-trips a secret", () => {
    const pt = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
    expect(open(seal(pt, key), key)).toBe(pt);
  });

  it("never leaks the plaintext in the sealed blob", () => {
    const pt = "super-secret-key";
    const blob = seal(pt, key);
    expect(blob).not.toContain(pt);
  });

  it("produces a different blob each time (random IV)", () => {
    expect(seal("x", key)).not.toBe(seal("x", key));
  });

  it("fails to open with the wrong key", () => {
    const blob = seal("x", key);
    expect(() => open(blob, deriveKey("different-secret"))).toThrow();
  });

  it("fails to open a tampered blob", () => {
    const blob = seal("x", key);
    const parts = blob.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => open(parts.join("."), key)).toThrow();
  });
});
