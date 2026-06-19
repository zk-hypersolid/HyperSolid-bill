import {
  HttpTransport,
  InfoClient,
  SubscriptionClient,
  WebSocketTransport,
} from "@nktkas/hyperliquid";
import type { Network } from "../../state/envStore";
import { resolveIsTestnet } from "./network";
import type { InfoLike, SubsLike } from "./types";

export function createInfoClient(network: Network): InfoLike {
  const transport = new HttpTransport({ isTestnet: resolveIsTestnet(network) });
  return new InfoClient({ transport }) as unknown as InfoLike;
}

export function createSubsClient(network: Network): SubsLike {
  const transport = new WebSocketTransport({ isTestnet: resolveIsTestnet(network) });
  return new SubscriptionClient({ transport }) as unknown as SubsLike;
}
