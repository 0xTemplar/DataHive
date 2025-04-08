import React from 'react';
import { useQuery } from '@tanstack/react-query';
import CampaignCard from '@/components/ui/cards/CampaignCard';
import { HiOutlineCollection, HiOutlineRefresh } from 'react-icons/hi';

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
    <div className="border border-gray-800 rounded-xl p-6 h-[260px] animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-[50px] h-[50px] rounded-full bg-[#f5f5fa14]"></div>
        <div className="flex-1">
          <div className="h-4 bg-[#f5f5fa14] rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-[#f5f5fa14] rounded w-1/2"></div>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex gap-2">
          <div className="h-6 bg-[#f5f5fa14] rounded w-16"></div>
          <div className="h-6 bg-[#f5f5fa14] rounded w-24"></div>
          <div className="h-6 bg-[#f5f5fa14] rounded w-20"></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-6 ml-2">
        <div className="border-r border-b border-gray-800">
          <div className="h-3 bg-[#f5f5fa14] rounded w-24 mb-2"></div>
          <div className="h-4 bg-[#f5f5fa14] rounded w-8"></div>
        </div>
        <div className="border-b pb-2 border-gray-800 pl-9">
          <div className="h-3 bg-[#f5f5fa14] rounded w-24 mb-2"></div>
          <div className="h-4 bg-[#f5f5fa14] rounded w-16"></div>
        </div>
        <div className="border-r border-gray-800">
          <div className="h-3 bg-[#f5f5fa14] rounded w-24 mb-2"></div>
          <div className="h-4 bg-[#f5f5fa14] rounded w-8"></div>
        </div>
        <div className="pl-9">
          <div className="h-3 bg-[#f5f5fa14] rounded w-24 mb-2"></div>
          <div className="h-4 bg-[#f5f5fa14] rounded w-20"></div>
        </div>
      </div>
    </div>
  );
};

const ActiveCampaigns = () => {
  const {
    data: campaigns,
    isLoading,
    refetch,
  } = useQuery<Campaign[]>({
    queryKey: ['activeCampaigns'],
    queryFn: async () => {
      const response = await fetch(`${baseUrl}/campaigns/active`);
      const data = await response.json();
      return data;
    },
  });

  console.log(campaigns);

  return (
    <div className="lg:max-w-[1100px] max-w-[1512px] relative mt-[40px]">
      {/* Header Section */}
      <div className="max-w-[1512px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="mt-10">
            <h1 className="text-2xl font-bold">Active Campaigns</h1>
            <p className="text-gray-400 mt-2 text-sm">
              Discover and participate in ongoing data collection campaigns
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-800 mb-8">
          <div className="flex items-center gap-8">
            <button className="flex items-center gap-2 px-4 py-3  text-gray-800 border-b-2 border-[#a855f7] font-medium">
              <HiOutlineCollection className="w-5 h-5" />
              All
            </button>
          </div>
        </div>

        {/* Loading State - Skeleton Loader */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <CampaignCardSkeleton key={index} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!campaigns || campaigns.length === 0) && (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <HiOutlineCollection className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300">
              No Active Campaigns
            </h3>
            <p className="text-gray-400 mt-2 max-w-md">
              There are currently no active campaigns. Check back later or
              create a new campaign.
            </p>
          </div>
        )}

        {/* Campaign Grid */}
        {!isLoading && campaigns && campaigns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.campaign_id} campaign={campaign} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveCampaigns;
