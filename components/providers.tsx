"use client";

import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  walletConnectWallet,
  rabbyWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { mainnet, arbitrum } from 'viem/chains';
import '@rainbow-me/rainbowkit/styles.css';

const rainbowProjectId = process.env.NEXT_PUBLIC_RAINBOW_PROJECT_ID || '';
const config = getDefaultConfig({
  appName: 'Sa',
  projectId: rainbowProjectId || '',
  chains: [mainnet, arbitrum],
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        walletConnectWallet,
        rabbyWallet,
      ],
    },
  ],
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 