import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import { networkConfig } from "./config";
import type { NeoNetwork } from "./types";

type ProvidersProps = PropsWithChildren<{
  network: NeoNetwork;
  apiKey?: string;
}>;

export function Providers({ children, network, apiKey }: ProvidersProps) {
  const queryClient = useMemo(() => new QueryClient(), []);
  const activeNetwork = networkConfig[network];

  return (
    <QueryClientProvider client={queryClient}>
      <AptosWalletAdapterProvider
        autoConnect
        dappConfig={{
          network: activeNetwork.walletNetwork,
          aptosApiKeys: apiKey ? { testnet: apiKey } : undefined,
        }}
      >
        {children}
      </AptosWalletAdapterProvider>
    </QueryClientProvider>
  );
}
