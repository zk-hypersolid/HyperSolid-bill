import { BiometricGate } from "./biometricGate";

function mockLA(over: Partial<Record<string, unknown>> = {}) {
  return {
    hasHardwareAsync: jest.fn().mockResolvedValue(true),
    isEnrolledAsync: jest.fn().mockResolvedValue(true),
    supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1, 2]),
    authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
    ...over,
  };
}

describe("BiometricGate.isAvailable", () => {
  it("reports available when hardware present and enrolled", async () => {
    const gate = new BiometricGate(mockLA() as never);
    expect(await gate.isAvailable()).toEqual({
      hasHardware: true,
      isEnrolled: true,
      supportedTypes: [1, 2],
    });
  });

  it("reports not enrolled when no biometric is set up", async () => {
    const gate = new BiometricGate(mockLA({ isEnrolledAsync: jest.fn().mockResolvedValue(false) }) as never);
    expect((await gate.isAvailable()).isEnrolled).toBe(false);
  });
});
