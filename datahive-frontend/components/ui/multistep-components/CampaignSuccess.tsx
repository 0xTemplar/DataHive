import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  ExternalLink,
  Key,
  Copy,
  Share2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useCampaign } from '@/context/CampaignContext';

interface CampaignSuccessProps {
  txHash: string;
  campaignPrivateKey: string;
}

const CampaignSuccess: React.FC<CampaignSuccessProps> = ({
  txHash,
  campaignPrivateKey,
}) => {
  const [showFullKey, setShowFullKey] = useState(false);
  const { campaignData } = useCampaign();
  const copyToClipboard = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Function to trim the private key for display
  const getTrimmedKey = (key: string) => {
    if (showFullKey) return key;
    const start = key.slice(0, 20);
    const end = key.slice(-20);
    return `${start}...${end}`;
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      {/* Success Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-[#a855f7]/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-[#a855f7]" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Campaign Created Successfully!
        </h2>
        <p className="text-[#f5f5fa7a]">
          Your campaign has been created and is now live on the blockchain
        </p>
      </div>

      {/* Transaction Details Card */}
      <div className="bg-[#f5f5fa08] rounded-xl p-6 mb-6 backdrop-blur-sm border border-[#f5f5fa14]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#f5f5faf4] font-semibold">
            Transaction Details
          </h3>
          <a
            href={`https://explorer.movementlabs.xyz/txn/${txHash}?network=bardock+testnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[#a855f7] hover:text-[#9333ea] transition-colors text-sm"
          >
            View on Explorer
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        <div className="flex items-center gap-2 bg-[#f5f5fa0a] rounded-lg p-3">
          <p className="text-sm text-[#f5f5fa7a] font-mono truncate">
            {txHash}
          </p>
          <button
            onClick={() => copyToClipboard(txHash, 'Transaction hash copied!')}
            className="p-1.5 hover:bg-[#f5f5fa14] rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4 text-[#f5f5fa7a]" />
          </button>
        </div>
      </div>

      {/* Private Key Card */}
      <div className="bg-[#f5f5fa08] rounded-xl p-6 backdrop-blur-sm border border-[#f5f5fa14]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[#a855f7]" />
            <h3 className="text-[#f5f5faf4] font-semibold">
              Campaign Private Key
            </h3>
          </div>
          <button
            onClick={() => setShowFullKey(!showFullKey)}
            className="flex items-center gap-2 text-[#f5f5fa7a] hover:text-[#f5f5faf4] transition-colors text-sm"
          >
            {showFullKey ? (
              <>
                <EyeOff className="w-4 h-4" />
                Hide Full Key
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Show Full Key
              </>
            )}
          </button>
        </div>
        <div className="bg-[#f5f5fa0a] rounded-lg p-4 mb-4">
          <p className="text-xs text-[#f5f5faf4] font-mono break-all">
            {getTrimmedKey(campaignPrivateKey)}
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() =>
              copyToClipboard(campaignPrivateKey, 'Full private key copied!')
            }
            className="flex items-center gap-2 px-4 py-2 bg-[#f5f5fa14] hover:bg-[#f5f5fa1a] 
            rounded-lg transition-colors text-sm text-[#f5f5faf4]"
          >
            <Copy className="w-4 h-4" />
            Copy Full Key
          </button>
          <button
            onClick={() => {
              const url = window.location.href;
              copyToClipboard(url, 'Campaign URL copied!');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#f5f5fa14] hover:bg-[#f5f5fa1a] 
            rounded-lg transition-colors text-sm text-[#f5f5faf4]"
          >
            <Share2 className="w-4 h-4" />
            Share Campaign
          </button>
          <Link href="/home">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-[#f5f5fa14] hover:bg-[#f5f5fa1a] 
              rounded-lg transition-colors text-sm text-[#f5f5faf4]"
            >
              <ExternalLink className="w-4 h-4" />
              View Campaign
            </button>
          </Link>
        </div>
      </div>

      {/* Important Notice */}
      <div className="mt-6 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
        <p className="text-sm text-yellow-200">
          Important: Save your private key securely. It will be needed to
          decrypt submitted data.
        </p>
      </div>
    </div>
  );
};

export default CampaignSuccess;
