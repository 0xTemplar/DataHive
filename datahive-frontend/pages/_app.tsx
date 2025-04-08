import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import {
  RainbowKitProvider,
  getDefaultWallets,
  connectorsForWallets,
} from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { darkTheme } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import '@rainbow-me/rainbowkit/styles.css';
import merge from 'lodash.merge';

export default function App({ Component, pageProps }: AppProps) {
  const queryClient = new QueryClient();

  const projectId = process.env.NEXT_PUBLIC_PROJECT_ID ?? '';

  const selectedChain =
    process.env.NEXT_PUBLIC_STAGE === 'testnet' ? baseSepolia : base;

  const { chains, publicClient, webSocketPublicClient } = configureChains(
    [selectedChain],
    [publicProvider()]
  );

  const demoAppInfo = {
    appName: 'TunnlV2',
  };
  const { wallets } = getDefaultWallets({
    appName: 'TunnlV2',
    projectId,
    chains,
  });

  const connectors = connectorsForWallets([
    ...wallets,
    {
      groupName: 'Other',
      wallets: [
        // argentWallet({ projectId, chains }),
        // trustWallet({ projectId, chains }),
        // ledgerWallet({ projectId, chains }),
      ],
    },
  ]);

  const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient,
    webSocketPublicClient,
  });

  const myTheme = merge(darkTheme(), {
    colors: {
      accentColor: '#8B5CF6',
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider
          modalSize="compact"
          chains={chains}
          appInfo={demoAppInfo}
          theme={myTheme}
        >
          <SubscriptionProvider>
            <Component {...pageProps} />
            <ToastContainer />
          </SubscriptionProvider>
        </RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}
