import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  HiX,
  HiSparkles,
  HiOutlineGift,
  HiClock,
  HiCheck,
} from 'react-icons/hi';
import { useAccount, useWalletClient } from 'wagmi';
import { toast } from 'react-toastify';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import DataHiveTokenABI from '@/abi/DataHiveToken.json';

interface MintTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MintTokensModal: React.FC<MintTokensModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  // Reset modal state when it opens
  const resetModal = () => {
    setIsSuccess(false);
    setTxHash(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleMint = async () => {
    if (!address || !walletClient) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsMinting(true);
    try {
      const hash = await walletClient.writeContract({
        account: address,
        chain: baseSepolia,
        address: process.env
          .NEXT_PUBLIC_DATA_HIVE_TOKEN_ADDRESS as `0x${string}`,
        abi: DataHiveTokenABI,
        functionName: 'publicMint',
      });

      setTxHash(hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        setIsSuccess(true);
        toast.success('Successfully minted 100 DHT tokens!');
      } else {
        toast.error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Error minting tokens:', error);
      toast.error(`Failed to mint tokens: ${error.message}`);
    } finally {
      setIsMinting(false);
    }
  };

  // Success view component
  const SuccessView = () => (
    <div className="text-center space-y-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] opacity-20 animate-pulse"></div>
        </div>
        <div className="relative flex justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] flex items-center justify-center">
            <HiSparkles className="h-10 w-10 text-white" />
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white">
        Tokens Minted Successfully!
      </h2>

      <p className="text-[#f5f5fa7a]">
        100 DHT tokens have been added to your wallet. Happy trading!
      </p>

      {txHash && (
        <div className="bg-[#f5f5fa0a] rounded-xl p-4 mt-4">
          <p className="text-sm text-[#f5f5fa7a] mb-1">Transaction Hash</p>
          <p className="font-mono text-xs text-[#f5f5faf4] truncate">
            {txHash}
          </p>
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#a855f7] hover:text-[#6366f1] transition-colors mt-2 inline-block"
          >
            View on Explorer →
          </a>
        </div>
      )}

      <div className="space-y-3 mt-4">
        <div className="flex items-center p-3 bg-[#f5f5fa0a] rounded-lg">
          <HiOutlineGift className="h-5 w-5 text-[#22c55e] mr-3" />
          <div className="text-left">
            <h3 className="text-sm font-medium text-white">Premium Support</h3>
            <p className="text-xs text-[#f5f5fa7a]">
              Priority access to our support team
            </p>
          </div>
        </div>

        <div className="flex items-center p-3 bg-[#f5f5fa0a] rounded-lg">
          <HiCheck className="h-5 w-5 text-[#22c55e] mr-3" />
          <div className="text-left">
            <h3 className="text-sm font-medium text-white">
              Advanced Features
            </h3>
            <p className="text-xs text-[#f5f5fa7a]">
              Access to all premium features
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleClose}
        className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold hover:opacity-90 transition-opacity"
      >
        Continue to DataHive
      </button>
    </div>
  );

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={handleClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#0f0f17] p-6 shadow-xl transition-all border border-[#f5f5fa14]">
              {!isSuccess ? (
                <>
                  <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 text-[#f5f5fa7a] hover:text-white transition-colors"
                  >
                    <HiX className="h-6 w-6" />
                  </button>

                  <Dialog.Title className="text-2xl font-bold text-white mb-2">
                    DHT Tokens Faucet
                  </Dialog.Title>
                  <Dialog.Description className="text-[#f5f5fa7a] text-sm mb-6">
                    Get 100 DHT tokens to participate in the DataHive ecosystem
                  </Dialog.Description>

                  <div className="space-y-4 mb-6">
                    {/* Token Amount Display */}
                    <div className="bg-gradient-to-r from-[#6366f1]/10 to-[#a855f7]/10 rounded-xl p-6 border border-[#f5f5fa14]">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] flex items-center justify-center">
                            <HiOutlineGift className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">Amount</h3>
                            <p className="text-[#f5f5fa7a] text-sm">
                              Fixed mint
                            </p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-white">
                          100 DHT
                        </span>
                      </div>
                    </div>

                    {/* Cooldown Info */}
                    <div className="bg-[#f5f5fa0a] rounded-xl p-4 flex items-center space-x-3">
                      <HiClock className="h-5 w-5 text-[#a855f7]" />
                      <div>
                        <h3 className="text-[#f5f5faf4] font-medium">
                          24h Cooldown
                        </h3>
                        <p className="text-[#f5f5fa7a] text-sm">
                          One mint per wallet every 24 hours
                        </p>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 text-[#f5f5fa7a]">
                        <HiCheck className="h-5 w-5 text-[#22c55e]" />
                        <span>No gas fees on Base Sepolia</span>
                      </div>
                      <div className="flex items-center space-x-3 text-[#f5f5fa7a]">
                        <HiCheck className="h-5 w-5 text-[#22c55e]" />
                        <span>Instant delivery</span>
                      </div>
                      <div className="flex items-center space-x-3 text-[#f5f5fa7a]">
                        <HiCheck className="h-5 w-5 text-[#22c55e]" />
                        <span>Use for platform features</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleMint}
                    disabled={isMinting}
                    className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMinting ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                        <span>Minting...</span>
                      </div>
                    ) : (
                      'Mint 100 DHT'
                    )}
                  </button>

                  <p className="mt-4 text-center text-xs text-[#f5f5fa7a]">
                    By minting tokens, you agree to the DataHive terms of
                    service
                  </p>
                </>
              ) : (
                <SuccessView />
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default MintTokensModal;
