import { classifyFetchError } from "./errorMessage";

describe("classifyFetchError", () => {
  it("maps the SDK HttpRequestError (Unknown HTTP request error) to network", () => {
    const e = new Error("Unknown HTTP request error: TypeError: Network request failed");
    e.name = "HttpRequestError";
    expect(classifyFetchError(e)).toBe("network");
  });

  it("maps a bare RN fetch failure to network", () => {
    expect(classifyFetchError(new TypeError("Network request failed"))).toBe("network");
  });

  it("maps transport / websocket / timeout errors to network", () => {
    const t = new Error("boom");
    t.name = "TransportError";
    expect(classifyFetchError(t)).toBe("network");
    expect(classifyFetchError(new Error("request timed out"))).toBe("network");
  });

  it("falls back to unknown for non-network errors", () => {
    expect(classifyFetchError(new Error("something odd"))).toBe("unknown");
    expect(classifyFetchError("weird string")).toBe("unknown");
  });
});
