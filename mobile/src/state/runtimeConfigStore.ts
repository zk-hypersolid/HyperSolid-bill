import { create } from "zustand";
import type { Network } from "./envStore";

/** Per-network values delivered from the server at runtime (never embedded in the bundle). */
export interface AppRuntimeConfig {
  arbitrumRpc: { mainnet: string | null; testnet: string | null };
}

interface RuntimeConfigState extends AppRuntimeConfig {
  setConfig: (cfg: AppRuntimeConfig) => void;
}

/**
 * Holds server-delivered runtime config (spec: secrets/keyed endpoints come from the server, not
 * EXPO_PUBLIC_* build env). Hydrated at startup by `loadAppConfig`; consumers read via `arbitrumRpcFor`.
 */
export const useRuntimeConfigStore = create<RuntimeConfigState>((set) => ({
  arbitrumRpc: { mainnet: null, testnet: null },
  setConfig: (cfg) => set({ arbitrumRpc: cfg.arbitrumRpc }),
}));

/** The server-delivered Arbitrum RPC URL for a network, or null until it has been delivered. */
export function arbitrumRpcFor(network: Network): string | null {
  return useRuntimeConfigStore.getState().arbitrumRpc[network];
}
