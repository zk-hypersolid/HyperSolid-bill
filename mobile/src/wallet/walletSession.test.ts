import { openStrategySession } from "./walletSession";

const api = {
  challenge: jest.fn(async () => ({ nonce: "nonce-xyz" })),
  session: jest.fn(async () => ({ token: "tok-abc" })),
};
const account = { signMessage: jest.fn(async () => "0xsig") };

describe("openStrategySession", () => {
  it("challenges, signs the nonce with the main key, and returns the token", async () => {
    const token = await openStrategySession(api as never, account as never, "0xowner");
    expect(api.challenge).toHaveBeenCalledWith("0xowner");
    expect(account.signMessage).toHaveBeenCalledWith({ message: "nonce-xyz" });
    expect(api.session).toHaveBeenCalledWith("0xowner", "nonce-xyz", "0xsig");
    expect(token).toBe("tok-abc");
  });
});
