import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import dynamic from 'next/dynamic';
import MintTokensModal from '../modals/MintTokensModal';
import { useSubscription } from '@/context/SubscriptionContext';
import { HiSparkles, HiOutlineStar } from 'react-icons/hi';
import Login from '@/container/Login';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const { isSubscribed, isLoading, subscriptionStatus, refreshSubscription } =
    useSubscription();
  const { isConnected } = useAccount();

  return (
    <>
      {isConnected ? (
        <div>
          <Sidebar />
          <div className="flex items-center gap-2 justify-end absolute top-6 right-10 ">
            <button className="border border-gray-800 rounded-lg text-sm p-2 px-4 flex items-center gap-2">
              <img
                src="/filecoin-logo.svg"
                alt=""
                className="w-[28px] h-[28px] p-1 rounded-2xl"
              />
              Filecoin
            </button>

            <button
              onClick={() => setIsMintModalOpen(true)}
              className="relative group overflow-hidden bg-gradient-to-r from-[#6366f1]/20 to-[#a855f7]/20 hover:from-[#6366f1]/30 hover:to-[#a855f7]/30 rounded-lg text-sm p-2 px-4 transition-all duration-300 border border-[#a855f7]/30"
            >
              {/* Animated background effect */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#6366f1]/0 via-[#a855f7]/20 to-[#6366f1]/0 -translate-x-full animate-shimmer"></span>

              <div className="flex items-center gap-2 relative z-10">
                <div className="relative">
                  <HiSparkles className="h-4 w-4 text-[#a855f7]" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
                  </span>
                </div>
                <span className="font-medium">Tokens Faucet</span>
              </div>
            </button>

            <ConnectButton showBalance={false} />
          </div>
          {children}

          <MintTokensModal
            isOpen={isMintModalOpen}
            onClose={() => setIsMintModalOpen(false)}
          />
        </div>
      ) : (
        <Login />
      )}
    </>
  );
};

export default Layout;
