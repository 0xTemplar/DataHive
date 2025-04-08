import React from 'react';
import OverviewCard from './OverviewCard';
import SparklineCard from './SparklineCard';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

interface ActivityStats {
  campaigns: {
    total: number;
    active: number;
    inactive: number;
    activeRate: number;
  };
  contributions: {
    total: number;
    verified: number;
    pending: number;
    successRate: number;
  };
}

interface AccountOverviewResponse {
  message: string;
  stats: ActivityStats;
  summary: {
    isActive: boolean;
    lastActive: string;
    primaryRole: string;
    activityLevel: string;
  };
}

const HomeHeader = () => {
  const { address } = useAccount();

  const { data: accountData, isLoading } = useQuery<AccountOverviewResponse>({
    queryKey: ['accountOverview', address],
    queryFn: async () => {
      if (!address) throw new Error('No wallet connected');
      const response = await fetch(
        `/api/activity/getAccountOverview?address=${address}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch account overview');
      }
      return response.json();
    },
    enabled: !!address,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Generate 30 days of sparse campaign data
  const dummyData = [
    12, 15, 10, 25, 18, 22, 16, 35, 28, 42, 38, 45, 30, 55, 48, 65, 58, 72, 63,
    85, 76, 92, 88, 105, 95, 120, 108, 145, 165, 214,
  ].map((value) => value + Math.floor(Math.random() * 20 - 10));

  return (
    <>
      <div className="lg:max-w-[1100px] max-w-[1512px] relative mt-[70px]">
        <div className="relative z-10">
          <div className="text-white pt-5">
            <h1 className="text-[18px] tracking-[2px] font-extrabold text-white/80">
              Account Overview
            </h1>
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-6">
            <SparklineCard title="Campaign Stats" data={dummyData} />
            <div className="grid grid-cols-2 gap-6">
              <OverviewCard
                title="Total Campaigns Created"
                amount={
                  isLoading
                    ? undefined
                    : accountData?.stats.campaigns.total || 0
                }
                loading={isLoading}
              />
              <OverviewCard
                title="Total Contributions"
                amount={
                  isLoading
                    ? undefined
                    : accountData?.stats.contributions.total || 0
                }
                loading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomeHeader;
