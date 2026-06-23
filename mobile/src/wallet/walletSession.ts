import type { StrategyApi } from "../services/strategyApi";

interface SignerAccount {
  signMessage(args: { message: string }): Promise<string>;
}

/**
 * Open a backend session by signing the challenge nonce with the on-device main key (spec §Auth).
 * The main private key never leaves the device — only the signature crosses the wire.
 */
export async function openStrategySession(
  api: StrategyApi,
  account: SignerAccount,
  owner: string,
): Promise<string> {
  const { nonce } = await api.challenge(owner);
  const signature = await account.signMessage({ message: nonce });
  const { token } = await api.session(owner, nonce, signature);
  return token;
}
