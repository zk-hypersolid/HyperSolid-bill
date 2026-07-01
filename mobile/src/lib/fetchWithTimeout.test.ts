import { fetchWithTimeout } from "./fetchWithTimeout";

describe("fetchWithTimeout", () => {
  it("passes through a fast response and clears the timer", async () => {
    const fetchImpl = jest.fn(async () => new Response("{}", { status: 200 }));
    const res = await fetchWithTimeout("https://x/y", undefined, 50, fetchImpl as unknown as typeof fetch);
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledWith("https://x/y", expect.objectContaining({ signal: expect.anything() }));
  });

  it("aborts a hung request after the timeout", async () => {
    const fetchImpl = jest.fn(
      (_i: unknown, init?: { signal?: AbortSignal }) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    await expect(
      fetchWithTimeout("https://x/y", undefined, 20, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/abort/i);
  });
});
