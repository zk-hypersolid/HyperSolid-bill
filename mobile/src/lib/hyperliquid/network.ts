import type { Network } from "../../state/envStore";

export function resolveIsTestnet(network: Network): boolean {
  return network === "testnet";
}
