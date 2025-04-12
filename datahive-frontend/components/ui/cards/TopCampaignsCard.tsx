import React from 'react';
import Avvvatars from 'avvvatars-react';
import {
  HiTrendingUp,
  HiStar,
  HiShieldCheck,
  HiCurrencyDollar,
} from 'react-icons/hi';

interface TopCampaignsCardProps {
  creator?: string;
  totalCampaigns?: number;
  totalAmountSpent?: number;
  reputationScore?: number;
  rank?: number;
}

const TopCampaignsCard: React.FC<TopCampaignsCardProps> = ({
  creator = '0x456...858',
  totalCampaigns = 45,
  totalAmountSpent = 720000000,
  reputationScore = 856,
  rank = 1,
}) => {
  // Function to determine reputation tier
  const getReputationTier = (
    score: number
  ): { label: string; color: string } => {
    if (score >= 900) return { label: 'Elite', color: 'text-yellow-500' };
    if (score >= 700) return { label: 'Expert', color: 'text-purple-400' };
    if (score >= 500) return { label: 'Advanced', color: 'text-blue-400' };
    if (score >= 300) return { label: 'Skilled', color: 'text-green-400' };
    return { label: 'Rising', color: 'text-gray-400' };
  };

  // Format wallet address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format amount to display in MOVE tokens
  const formatAmount = (amount: number) => {
    return (amount / 100000000).toFixed(2);
  };

  // Calculate percentage for progress bar (based on reputation)
  const progressPercentage = Math.min(100, (reputationScore / 1000) * 100);

  const reputationTier = getReputationTier(reputationScore);

  return (
    <div className="radial-gradient-border border border-gray-800 rounded-xl p-6 w-[370px]">
      <div className="inner-content relative">
        {/* Rank Badge */}
        <div className="absolute -top-3 -right-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-bold text-sm">
            #{rank}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Avatar and Primary Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avvvatars value={creator} style="character" size={70} />
              <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-[#0f0f17] border-2 border-[#6366f1]">
                <HiShieldCheck
                  className={`w-3.5 h-3.5 ${reputationTier.color}`}
                />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium">
                  {formatAddress(creator)}
                </span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f5f5fa14]">
                  <HiStar className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-[10px] text-[#f5f5fa7a]">
                    Top Creator
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <HiTrendingUp className="w-4 h-4 text-[#a855f7]" />
                <span className="text-white text-lg font-semibold">
                  {totalCampaigns} Campaigns
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <HiCurrencyDollar className="w-3.5 h-3.5 text-[#a855f7]" />
                <span className="text-[#f5f5fa7a] text-xs">Total Spent</span>
              </div>
              <span className="text-white text-sm font-medium">
                {(totalAmountSpent)} DHT
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <HiShieldCheck className="w-3.5 h-3.5 text-[#a855f7]" />
                <span className="text-[#f5f5fa7a] text-xs">
                  Reputation Score
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-white text-sm font-medium">
                  {reputationScore}
                </span>
                <span className={`text-[10px] ${reputationTier.color}`}>
                  {reputationTier.label}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative pt-2">
            <div className="h-1.5 w-full bg-[#f5f5fa14] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopCampaignsCard;
