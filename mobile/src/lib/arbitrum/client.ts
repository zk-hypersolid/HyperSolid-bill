import { createWalletClient, http } from "viem";
import { arbitrum, arbitrumSepolia } from "viem/chains";
import type { Account } from "viem";
import type { Network } from "../../state/envStore";
import type { ArbitrumDepositClient } from "../../services/deposit";

/**
 * Isolated viem wiring for in-app Arbitrum deposits (spec §B2b). Imported ONLY by the screen so the
 * native/EVM bits stay out of jest (the service is unit-tested against a fake `ArbitrumDepositClient`).
 * The RPC URL is **delivered by the server at runtime** (see `runtimeConfigStore`) and passed in here
 * — it is NEVER hardcoded or embedded via EXPO_PUBLIC_* build env.
 */

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export function createArbitrumDepositClient(
  network: Network,
  account: Account,
  rpcUrl: string,
): ArbitrumDepositClient {
  const chain = network === "mainnet" ? arbitrum : arbitrumSepolia;
  const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });
  return {
    async transferUsdc({ usdc, bridge, amountBaseUnits }) {
      return wallet.writeContract({
        address: usdc,
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [bridge, amountBaseUnits],
        chain,
        account,
      });
    },
  };
}
