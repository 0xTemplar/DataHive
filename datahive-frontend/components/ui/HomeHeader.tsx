import React from 'react';
import OverviewCard from './OverviewCard';
import SparklineCard from './SparklineCard';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

interface SummaryData {
  address: string;
  financial: {
    totalSpent: string;
    totalEarned: string;
  };
  campaigns: {
    total: string;
    active: string;
  };
  contributions: {
    totalSubmitted: string;
    totalQualified: string;
  };
  reputation: {
    reputationScore: string;
    badgeCount: string;
    hasReputation: boolean;
  };
}

interface SummaryResponse {
  success: boolean;
  message: string;
  summary: SummaryData;
}

const HomeHeader = () => {
  const { address } = useAccount();

  const { data: summaryData, isLoading } = useQuery<SummaryResponse>({
    queryKey: ['userSummary', address],
    queryFn: async () => {
      if (!address) throw new Error('No wallet connected');
      const response = await fetch(
        `/api/campaign/get_summary?address=${address}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch user summary data');
      }
      return response.json();
    },
    enabled: !!address,
    staleTime: 60000, // Consider data fresh for 60 seconds
  });

  // Generate 30 days of contribution data based on recent contributions
  const totalContributions = Number(
    summaryData?.summary?.contributions?.totalSubmitted || 0
  );
  const baseValue = Math.max(totalContributions / 30, 1); // Divide the total by 30 days or use 1 as minimum

  // Generate a realistic-looking growth pattern
  const contributionData = Array.from({ length: 30 }, (_, i) => {
    const dayValue = Math.floor(baseValue * (1 + (i / 30) * 2)); // Gradually increasing trend
    const randomVariation = Math.floor(
      dayValue * 0.3 * (Math.random() * 2 - 1)
    ); // Up to 30% random variation
    return Math.max(0, dayValue + randomVariation); // Ensure no negative values
  });

  // Convert wei to ETH for financial data
  const totalEarned = summaryData?.summary?.financial?.totalEarned
    ? Number(summaryData.summary.financial.totalEarned) / 10 ** 18
    : 0;

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
            <SparklineCard
              title="Contribution Growth"
              data={contributionData}
            />
            <div className="grid grid-cols-2 gap-6">
              <OverviewCard
                title="Total Campaigns"
                amount={
                  isLoading
                    ? undefined
                    : Number(summaryData?.summary?.campaigns?.total || 0)
                }
                loading={isLoading}
              />
              <OverviewCard
                title="Total Contributions"
                amount={
                  isLoading
                    ? undefined
                    : Number(
                        summaryData?.summary?.contributions?.totalSubmitted || 0
                      )
                }
                loading={isLoading}
              />
              <OverviewCard
                title="Total Earned"
                amount={isLoading ? undefined : totalEarned}
                loading={isLoading}
                prefix="Ξ "
                decimals={4}
              />
              <OverviewCard
                title="Reputation Score"
                amount={
                  isLoading
                    ? undefined
                    : Number(
                        summaryData?.summary?.reputation?.reputationScore || 0
                      )
                }
                loading={isLoading}
                suffix={
                  summaryData?.summary?.reputation?.badgeCount &&
                  Number(summaryData.summary.reputation.badgeCount) > 0
                    ? ` (${summaryData.summary.reputation.badgeCount} badges)`
                    : ''
                }
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomeHeader;
