jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));
import * as Sentry from "@sentry/react-native";
import { shouldEnableSentry, initSentry, sentryBreadcrumb } from "./sentry";

describe("shouldEnableSentry", () => {
  it("is true only with a dsn, not in dev, not in Expo Go", () => {
    expect(shouldEnableSentry({ dsn: "https://x@y/1", isDev: false, isExpoGo: false })).toBe(true);
    expect(shouldEnableSentry({ dsn: "", isDev: false, isExpoGo: false })).toBe(false);
    expect(shouldEnableSentry({ dsn: "https://x@y/1", isDev: true, isExpoGo: false })).toBe(false);
    expect(shouldEnableSentry({ dsn: "https://x@y/1", isDev: false, isExpoGo: true })).toBe(false);
  });
});

describe("initSentry", () => {
  beforeEach(() => (Sentry.init as jest.Mock).mockClear());
  it("does not init when disabled", () => {
    initSentry({ dsn: "", isDev: true, isExpoGo: true });
    expect(Sentry.init).not.toHaveBeenCalled();
  });
  it("inits with a beforeSend scrubber when enabled", () => {
    initSentry({ dsn: "https://x@y/1", isDev: false, isExpoGo: false });
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const opts = (Sentry.init as jest.Mock).mock.calls[0][0];
    expect(opts.dsn).toBe("https://x@y/1");
    const scrubbed = opts.beforeSend({ extra: { privateKey: "0xdead" } });
    expect(scrubbed.extra.privateKey).toBeUndefined();
  });
});

describe("sentryBreadcrumb", () => {
  it("forwards a scrubbed breadcrumb to Sentry", () => {
    (Sentry.addBreadcrumb as jest.Mock).mockClear();
    sentryBreadcrumb("ledger.persist", { privateKey: "0xdead", cloid: "0xabc" });
    const arg = (Sentry.addBreadcrumb as jest.Mock).mock.calls[0][0];
    expect(arg.message).toBe("ledger.persist");
    expect(arg.data.privateKey).toBeUndefined();
    expect(arg.data.cloid).toBe("0xabc");
  });
});
