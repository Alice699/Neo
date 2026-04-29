import { Network } from "@aptos-labs/ts-sdk";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import type { NeoNetwork } from "./types";

export function createShelbyClient(network: NeoNetwork, apiKey?: string) {
  return new ShelbyClient({
    network: network === "testnet" ? Network.TESTNET : Network.SHELBYNET,
    apiKey: apiKey || undefined,
  });
}
