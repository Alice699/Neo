import { Network } from "@aptos-labs/ts-sdk";
import type { NeoNetwork, NeoSettings } from "./types";

export const STORAGE_KEY = "neo-vault-files";
export const SETTINGS_KEY = "neo-settings";

export const networkConfig: Record<
  NeoNetwork,
  {
    label: string;
    description: string;
    rpc: string;
    indexer: string;
    fullnode: string;
    explorerNetwork: string;
    walletNetwork: Network;
  }
> = {
  shelbynet: {
    label: "shelbynet",
    description: "Fast Shelby development network, isolated from Aptos mainnet/testnet/devnet.",
    rpc: "https://api.shelbynet.shelby.xyz/shelby",
    indexer: "https://api.shelbynet.shelby.xyz/v1/graphql",
    fullnode: "https://api.shelbynet.shelby.xyz/v1",
    explorerNetwork: "shelbynet",
    walletNetwork: Network.TESTNET,
  },
  testnet: {
    label: "shelby testnet",
    description: "Shelby testnet routing backed by Aptos testnet infrastructure.",
    rpc: "https://api.testnet.shelby.xyz/shelby",
    indexer: "https://api.testnet.aptoslabs.com/v1/graphql",
    fullnode: "https://api.testnet.aptoslabs.com/v1",
    explorerNetwork: "testnet",
    walletNetwork: Network.TESTNET,
  },
};

export const defaultSettings = {
  theme: "dark",
  network: "shelbynet",
  apiKey: "",
} as const;

export const bundledApiKey = import.meta.env.VITE_SHELBY_API_KEY?.trim() ?? "";

export function getEffectiveApiKey(settings: Pick<NeoSettings, "apiKey">) {
  return settings.apiKey.trim() || bundledApiKey;
}
