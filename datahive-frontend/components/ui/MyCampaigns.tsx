import React from 'react';
import CampaignCard from './cards/CampaignCard';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

interface Campaign {
  campaign_id: string;
  creator_wallet_address: string;
  current_contributions: number;
  description: string;
  expiration: number;
  is_active: boolean;
  max_data_count: number;
  onchain_campaign_id: string;
  title: string;
  total_budget: number;
  unit_price: number;
  campaign_type: string;
}

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

// Skeleton loader for campaign cards
const CampaignCardSkeleton = () => {
  return (
    <div className="border border-gray-800 rounded-xl p-6 h-[260px] bg-[#f5f5fa0a]">
      <div className="animate-pulse">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[#f5f5fa14] h-[50px] w-[50px]"></div>
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-[#f5f5fa14] rounded w-3/4"></div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <div className="bg-[#f5f5fa14] h-6 w-16 rounded-md"></div>
            <div className="bg-[#f5f5fa14] h-6 w-24 rounded-md"></div>
            <div className="bg-[#f5f5fa14] h-6 w-28 rounded-md"></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 ml-2">
          <div className="border-r border-b border-gray-800">
            <div className="h-3 bg-[#f5f5fa14] rounded w-28 mb-2"></div>
            <div className="h-4 bg-[#f5f5fa14] rounded w-12"></div>
          </div>
          <div className="border-b pb-2 border-gray-800 pl-9">
            <div className="h-3 bg-[#f5f5fa14] rounded w-28 mb-2"></div>
            <div className="h-4 bg-[#f5f5fa14] rounded w-20"></div>
          </div>
          <div className="border-r border-gray-800">
            <div className="h-3 bg-[#f5f5fa14] rounded w-24 mb-2"></div>
            <div className="h-4 bg-[#f5f5fa14] rounded w-8"></div>
          </div>
          <div className="pl-9">
            <div className="h-3 bg-[#f5f5fa14] rounded w-24 mb-2"></div>
            <div className="h-4 bg-[#f5f5fa14] rounded w-24"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MyCampaigns = () => {
  const { address } = useAccount();

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ['myCampaigns', address],
    queryFn: async () => {
      if (!address) return [];
      try {
        const response = await fetch(
          `${baseUrl}/campaigns/${address}/campaigns/created`
        );
        const data = await response.json();
        console.log('My campaigns:', data);

        // Ensure data is an array
        if (Array.isArray(data)) {
          return data;
        } else {
          console.error('Expected array but received:', data);
          return [];
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        return [];
      }
    },
    enabled: !!address,
  });

  // Base container with header that's always visible
  const renderContent = () => {
    if (!address) {
      return (
        <p className="text-white/60 mt-6">
          Please connect your wallet to view your campaigns.
        </p>
      );
    }

    if (isLoading) {
      return (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, index) => (
            <CampaignCardSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      );
    }

    const campaignsArray = Array.isArray(campaigns) ? campaigns : [];

    if (campaignsArray.length === 0) {
      return <p className="text-white/60 mt-6">No campaigns found.</p>;
    }

    return (
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {campaignsArray.map((campaign) => (
          <CampaignCard key={campaign.campaign_id} campaign={campaign} />
        ))}
      </div>
    );
  };

  return (
    <div className="lg:max-w-[1100px] max-w-[1512px] relative mt-[40px]">
      <h1 className="text-[18px] tracking-[2px] font-extrabold text-white/80">
        My Campaigns
      </h1>
      {renderContent()}
    </div>
  );
};

export default MyCampaigns;
