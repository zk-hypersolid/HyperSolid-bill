import { qrPath } from "./QrCode";

describe("qrPath", () => {
  it("produces a square side and a non-empty path for an address", () => {
    const { side, d } = qrPath("0x5F19582B9EEefa42A5CC87eB6acF5840c8f018AC");
    expect(side).toBeGreaterThan(20);
    expect(d.length).toBeGreaterThan(0);
    expect(d.startsWith("M")).toBe(true);
  });

  it("differs for different content", () => {
    expect(qrPath("0xaaa").d).not.toBe(qrPath("0xbbb").d);
  });
});
