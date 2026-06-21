export interface LocalAuthLike {
  hasHardwareAsync(): Promise<boolean>;
  isEnrolledAsync(): Promise<boolean>;
  supportedAuthenticationTypesAsync(): Promise<number[]>;
  authenticateAsync(opts: {
    promptMessage: string;
    disableDeviceFallback?: boolean;
    cancelLabel?: string;
  }): Promise<{ success: boolean; error?: string; warning?: string }>;
}

export interface BiometricAvailability {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: number[];
}

export type AuthResult = "success" | "failed" | "unavailable" | "cancelled";

export class BiometricGate {
  constructor(private la: LocalAuthLike) {}

  async isAvailable(): Promise<BiometricAvailability> {
    const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
      this.la.hasHardwareAsync(),
      this.la.isEnrolledAsync(),
      this.la.supportedAuthenticationTypesAsync(),
    ]);
    return { hasHardware, isEnrolled, supportedTypes };
  }
}
