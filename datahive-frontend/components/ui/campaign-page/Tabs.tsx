import React, { useState, useEffect } from 'react';
import Overview from './tabs-content/Overview';
import Contributions from './tabs-content/Contributions';
import Analytics from './tabs-content/Analytics';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { useSubscription } from '@/context/SubscriptionContext';

interface Campaign {
  campaign_id: string;
  campaign_type: string;
  created_at: string;
  creator_wallet_address: string;
  current_contributions: number;
  data_requirements: string;
  description: string;
  expiration: number;
  is_active: boolean;
  max_data_count: number;
  metadata_uri: string;
  min_data_count: number;
  onchain_campaign_id: string;
  platform_fee: number;
  quality_criteria: string;
  title: string;
  total_budget: number;
  transaction_hash: string;
  unit_price: number;
  unique_contributions_count: number;
}

const Tabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { address } = useAccount();
  const router = useRouter();
  const { id } = router.query;
  const { isSubscribed } = useSubscription();
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

  const {
    data: campaignData,
    isLoading,
    isFetching,
  } = useQuery<Campaign>({
    queryKey: ['campaign', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`${baseUrl}/campaigns/${id}`);
      const data = await response.json();
      console.log('Campaign details:', data);
      return data;
    },
    enabled: !!id,
    staleTime: 0, // Consider data stale immediately
    cacheTime: 0, // Don't cache the data
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const isOwner = address === campaignData?.creator_wallet_address;
  const canAccessAnalytics = isOwner && isSubscribed;

  useEffect(() => {
    // Redirect to overview if user is not the owner or trying to access analytics without subscription
    if (
      (!isOwner &&
        (activeTab === 'contributions' || activeTab === 'analytics')) ||
      (activeTab === 'analytics' && !isSubscribed)
    ) {
      setActiveTab('overview');
    }
  }, [isOwner, activeTab, isSubscribed]);

  // Show loading skeleton on initial load or when refetching data
  if (isLoading || (isFetching && !campaignData)) {
    return (
      <div className="w-full mt-[80px]">
        {/* Tab Navigation Skeleton */}
        <div className="border-b border-gray-800 mb-6">
          <div className="flex gap-8">
            <div className="pb-4 w-24 h-8 bg-[#f5f5fa14] rounded-md animate-pulse"></div>
            <div className="pb-4 w-28 h-8 bg-[#f5f5fa0a] rounded-md animate-pulse"></div>
            <div className="pb-4 w-32 h-8 bg-[#f5f5fa0a] rounded-md animate-pulse"></div>
          </div>
        </div>

        {/* Tab Content Skeleton - We show this at the Tabs component level instead of in each tab component */}
        <div className="mt-6 space-y-6">
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
            <div className="col-span-2 space-y-6">
              <div className="rounded-xl border border-[#f5f5fa14] p-6">
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

            {/* Payment Breakdown Skeleton */}
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
  }

  if (!campaignData) {
    return (
      <div className="w-full mt-[80px] text-center text-[#f5f5fa7a]">
        Campaign not found
      </div>
    );
  }

  return (
    <div className="w-full mt-[80px]">
      {/* Tab Navigation */}
      <div className="border-b border-gray-800 mb-6">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-sm font-medium relative ${
              activeTab === 'overview'
                ? 'text-white after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-gradient-to-r after:from-[#6366f1] after:to-[#a855f7]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Overview
          </button>

          {isOwner && (
            <>
              <button
                onClick={() => setActiveTab('contributions')}
                className={`pb-4 text-sm font-medium relative ${
                  activeTab === 'contributions'
                    ? 'text-white after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-gradient-to-r after:from-[#6366f1] after:to-[#a855f7]'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Contributions
              </button>

              {/* Only show analytics tab if user is subscribed */}
              {isSubscribed ? (
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`pb-4 text-sm font-medium relative ${
                    activeTab === 'analytics'
                      ? 'text-white after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-gradient-to-r after:from-[#6366f1] after:to-[#a855f7]'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Analytics{' '}
                  <span className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white p-1 px-2 rounded-md rounded-bl-[20px] rounded-l-none rounded-tr-[20px] py-1 text-xs font-semibold">
                    Premium
                  </span>
                </button>
              ) : (
                <button
                  className={`pb-4 text-sm font-medium relative text-gray-400  ${
                    isSubscribed
                      ? 'cursor-pointer hover:text-gray-300'
                      : 'cursor-not-allowed'
                  }`}
                >
                  Analytics{' '}
                  <span className="bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white p-1 px-2 rounded-md rounded-bl-[20px] rounded-l-none rounded-tr-[20px] py-1 text-xs font-semibold">
                    (premium only)
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div>
            <Overview
              campaign={campaignData}
              isOwner={isOwner}
              isLoading={false}
            />
          </div>
        )}
        {isOwner && activeTab === 'contributions' && (
          <div>
            <Contributions campaign={campaignData} isLoading={false} />
          </div>
        )}
        {canAccessAnalytics && activeTab === 'analytics' && (
          <div>
            <Analytics campaign={campaignData} isLoading={false} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Tabs;
