import React, { useState, useEffect } from 'react';
import Avvvatars from 'avvvatars-react';
import {
  HiOutlineInformationCircle,
  HiOutlineCalendar,
  HiOutlineTag,
  HiOutlineClock,
  HiShieldCheck,
  HiArrowRight,
} from 'react-icons/hi';
import PaymentBreakdown from '../../cards/PaymentBreakdown';
import { useQuery } from '@tanstack/react-query';
import SubmitDataModal from '@/components/modals/SubmitDataModal';
import useCampaignStore, { Campaign } from '@/helpers/store/useCampaignStore';
import { useAccount } from 'wagmi';

interface UserReputation {
  reputation_score: number;
  contribution_count: number;
  successful_payments: number;
  has_store: boolean;
}

interface OverviewProps {
  campaign: Campaign;
  isOwner: boolean;
  isLoading?: boolean;
}

// Skeleton loader for the Overview tab
export const OverviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header Section Skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#f5f5fa14] animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-6 w-48 bg-[#f5f5fa14] rounded animate-pulse"></div>
              <div className="h-4 w-32 bg-[#f5f5fa0a] rounded animate-pulse"></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-8 w-64 bg-[#f5f5fa14] rounded animate-pulse"></div>
            <div className="flex items-center gap-4">
              <div className="h-4 w-24 bg-[#f5f5fa0a] rounded animate-pulse"></div>
              <div className="h-4 w-24 bg-[#f5f5fa0a] rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-4 gap-6">
        {/* Campaign Details Skeleton */}
        <div className="col-span-2 space-y-6">
          <div className="rounded-xl border border-[#f5f5fa14] p-6 radial-gradient-border">
            <div className="inner-content">
              <div className="h-6 w-48 bg-[#f5f5fa14] rounded mb-4 animate-pulse"></div>
              <div className="space-y-4">
                <div className="h-4 w-full bg-[#f5f5fa0a] rounded animate-pulse"></div>
                <div className="h-4 w-full bg-[#f5f5fa0a] rounded animate-pulse"></div>
                <div className="h-4 w-3/4 bg-[#f5f5fa0a] rounded animate-pulse"></div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#f5f5fa14]">
                  <div>
                    <div className="h-4 w-32 bg-[#f5f5fa14] rounded mb-4 animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-[#f5f5fa0a] rounded animate-pulse"></div>
                      <div className="h-3 w-full bg-[#f5f5fa0a] rounded animate-pulse"></div>
                      <div className="h-3 w-3/4 bg-[#f5f5fa0a] rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div>
                    <div className="h-4 w-32 bg-[#f5f5fa14] rounded mb-4 animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-[#f5f5fa0a] rounded animate-pulse"></div>
                      <div className="h-3 w-full bg-[#f5f5fa0a] rounded animate-pulse"></div>
                      <div className="h-3 w-3/4 bg-[#f5f5fa0a] rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-xl border border-[#f5f5fa14] p-6">
            <div className="h-6 w-48 bg-[#f5f5fa14] rounded mb-4 animate-pulse"></div>
            <div className="space-y-4">
              <div className="h-16 w-full bg-[#f5f5fa0a] rounded animate-pulse"></div>
              <div className="h-16 w-full bg-[#f5f5fa0a] rounded animate-pulse"></div>
              <div className="h-16 w-full bg-[#f5f5fa0a] rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Overview: React.FC<OverviewProps> = ({
  campaign,
  isOwner,
  isLoading,
}) => {
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const { setCampaign } = useCampaignStore();
  const { address, isConnected } = useAccount();

  useEffect(() => {
    setCampaign(campaign);
  }, [campaign, setCampaign]);

  // If loading, show skeleton
  if (isLoading) {
    return <OverviewSkeleton />;
  }

  // Format the creation date
  const createdDate = new Date(campaign.created_at).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );

  // Format the expiration date
  const expirationDate = new Date(campaign.expiration * 1000);
  const timeRemaining = Math.max(
    0,
    Math.floor((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  // Split requirements and quality criteria into bullet points
  const requirements = campaign.data_requirements.split('|||').filter(Boolean);
  const qualityCriteria = campaign.quality_criteria
    .split('|||')
    .filter(Boolean);

  // Format wallet address for display
  const shortenedAddress = `${campaign.creator_wallet_address.slice(
    0,
    6
  )}...${campaign.creator_wallet_address.slice(-4)}`;

  // Fetch user reputation
  const { data: reputationData, isLoading: isLoadingReputation } = useQuery<{
    message: string;
    reputation: UserReputation;
  }>({
    queryKey: ['userReputation', campaign.creator_wallet_address],
    queryFn: async () => {
      const response = await fetch(
        `/api/campaign/getUserReputation?address=${campaign.creator_wallet_address}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch reputation');
      }
      return response.json();
    },
    staleTime: 30000,
  });

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avvvatars
                value={campaign.creator_wallet_address}
                size={64}
                style="shape"
              />
              <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-[#0f0f17] border-2 border-[#6366f1]">
                <HiShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[#f5f5faf4] text-xl font-semibold">
                  {shortenedAddress}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white">
                  Campaign Owner
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[#f5f5fa7a] text-sm">
                  {campaign.campaign_type} Campaign
                </span>

                {isLoadingReputation ? (
                  <span className="text-purple-400 text-sm animate-pulse">
                    Loading reputation...
                  </span>
                ) : (
                  <span className="text-purple-400 text-sm">
                    {reputationData?.reputation.reputation_score === 0 ? (
                      <>New Creator</>
                    ) : (
                      <>
                        {reputationData?.reputation.reputation_score} reputation
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HiOutlineTag className="w-5 h-5 text-[#a855f7]" />
              <h1 className="text-[#f5f5faf4] text-2xl font-bold">
                {campaign.title}
              </h1>
            </div>
            <div className="flex items-center gap-4 text-[#f5f5fa7a] text-sm">
              <div className="flex items-center gap-1">
                <HiOutlineCalendar className="w-4 h-4" />
                <span>Created {createdDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <HiOutlineClock className="w-4 h-4" />
                <span>Ends in {timeRemaining} days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-4 gap-6">
        {/* Campaign Details */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-xl border border-[#f5f5fa14] p-6 radial-gradient-border">
            <div className="inner-content">
              <div className="flex items-center gap-2 mb-4">
                <HiOutlineInformationCircle className="w-5 h-5 text-[#a855f7]" />
                <h3 className="text-[#f5f5faf4] text-lg font-semibold">
                  Campaign Details
                </h3>
              </div>
              <div className="space-y-4">
                <p className="text-[#f5f5faf4] text-sm leading-relaxed">
                  {campaign.description}
                </p>
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#f5f5fa14]">
                  <div>
                    <h4 className="text-[#f5f5fa7a] text-sm mb-2">
                      Requirements
                    </h4>
                    <ul className="space-y-2 text-[#f5f5faf4] text-sm">
                      {requirements.map((req, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[#f5f5fa7a] text-sm mb-2">
                      Quality Criteria
                    </h4>
                    <ul className="space-y-2 text-[#f5f5faf4] text-sm">
                      {qualityCriteria.map((criteria, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
                          {criteria}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <PaymentBreakdown
            totalBudget={campaign?.total_budget}
            contributorsCount={campaign?.unique_contributions_count}
            submissionsCount={campaign?.current_contributions}
            currency="MOVE"
          />
        </div>
      </div>

      {/* Only show Submit Data button if user is not the owner */}
      {!isOwner && (
        <>
          {isConnected ? (
            <>
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                disabled={
                  campaign.current_contributions >= campaign.max_data_count
                }
                className={`flex text-sm items-center gap-2 px-6 py-3 rounded-xl ${
                  campaign.current_contributions >= campaign.max_data_count
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'gradient-border text-white hover:opacity-90 transition-opacity'
                }`}
              >
                {campaign.current_contributions >= campaign.max_data_count
                  ? 'Campaign Full'
                  : 'Submit Data'}
                {campaign.current_contributions < campaign.max_data_count && (
                  <HiArrowRight className="w-5 h-5" />
                )}
              </button>
              {campaign.current_contributions >= campaign.max_data_count && (
                <p className="text-[#f5f5fa7a] text-sm pb-6">
                  This campaign has reached its maximum submission limit.
                </p>
              )}
            </>
          ) : (
            <div className=" border border-[#f5f5fa14] rounded-xl p-4 mb-6 w-[370px]">
              <p className="text-[#f5f5faf4] text-sm mb-2">
                Connect your wallet to submit data to this campaign
              </p>
              <p className="text-[#f5f5fa7a] text-xs">
                You need to connect an Aptos wallet to participate in data
                collection campaigns
              </p>
            </div>
          )}
        </>
      )}

      <SubmitDataModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
      />
    </div>
  );
};

export default Overview;
