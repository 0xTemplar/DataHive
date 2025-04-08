import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import ContributionsTableRow from './ContributionsTableRow';
import { HiFilter } from 'react-icons/hi';
import { useQuery } from '@tanstack/react-query';

interface TableContribution {
  id: string;
  creator: {
    avatar: string;
    name: string;
    address: string;
    reputation: number;
  };
  verificationStatus: 'Verified' | 'Pending';
  verifierReputation: number;
  qualityScore: number;
  rewardStatus: 'Released' | 'Pending';
  dataUrl: string;
  submittedAt: string;
  rewardAmount: number;
}

interface Contribution {
  contribution_id: string;
  campaign_id: string;
  contributor: string;
  data_url: string;
  data_hash: string;
  timestamp: string;
  verification_scores: {
    verifier_reputation: number;
    quality_score: number;
  };
  is_verified: boolean;
  reward_released: boolean;
  contributor_reputation?: number;
}

interface ApiResponse {
  contributions: Contribution[];
  statistics: {
    totalContributions: number;
    verifiedContributions: number;
    rewardsReleased: number;
    verificationRate: number;
    rewardRate: number;
  };
  additionalInfo: {
    campaignDetails: {
      unitPrice: number;
      // ... other fields if needed
    } | null;
    escrowInfo: {
      unitReward: number;
      // ... other fields if needed
    } | null;
  } | null;
}

interface ContributionsTableProps {
  onContributionsChange: (
    contributions: Array<{
      dataUrl: string;
      creator: {
        name: string;
      };
    }>
  ) => void;
}

const ContributionsTable: React.FC<ContributionsTableProps> = ({
  onContributionsChange,
}) => {
  const router = useRouter();
  const { id } = router.query;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const { data, isLoading, isError, isFetching } = useQuery<ApiResponse>({
    queryKey: ['contributions', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(
        `/api/campaign/getCampaignContributions?campaignId=${id}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch contributions');
      }
      return response.json();
    },
    enabled: !!id,
    staleTime: 0,
    cacheTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 15000,
  });

  // Memoize the filtered data
  const filteredData = useMemo(
    () =>
      data?.contributions?.filter((contribution) => {
        const matchesSearch = contribution.contributor
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === 'All' ||
          (statusFilter === 'Verified' && contribution.is_verified) ||
          (statusFilter === 'Pending' && !contribution.is_verified);

        return matchesSearch && matchesStatus;
      }) || [],
    [data?.contributions, searchTerm, statusFilter]
  );

  // Memoize the transformed data
  const transformedData = useMemo(
    () =>
      filteredData.map((contribution) => ({
        dataUrl: contribution.data_url,
        creator: {
          name: `${contribution.contributor.slice(
            0,
            6
          )}...${contribution.contributor.slice(-4)}`,
        },
      })),
    [filteredData]
  );

  // Update parent component only when transformed data changes
  React.useEffect(() => {
    onContributionsChange(transformedData);
  }, [transformedData, onContributionsChange]);

  // Show loading only on initial load (when no data is available)
  if (isLoading && !data) {
    return (
      <div className="text-center py-8">
        <p className="text-[#f5f5fa7a] text-sm animate-pulse">
          Loading contributions...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 text-sm">
          Error loading contributions. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-5">
      {/* Stats Summary */}
      {/* {data?.statistics && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-[#f5f5fa0a]">
            <p className="text-[#f5f5fa7a] text-xs">Total Contributions</p>
            <p className="text-[#f5f5faf4] text-xl font-semibold">
              {data.statistics.totalContributions}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#f5f5fa0a]">
            <p className="text-[#f5f5fa7a] text-xs">Verified</p>
            <p className="text-[#f5f5faf4] text-xl font-semibold">
              {data.statistics.verifiedContributions}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#f5f5fa0a]">
            <p className="text-[#f5f5fa7a] text-xs">Verification Rate</p>
            <p className="text-[#f5f5faf4] text-xl font-semibold">
              {data.statistics.verificationRate.toFixed(1)}%
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#f5f5fa0a]">
            <p className="text-[#f5f5fa7a] text-xs">Rewards Released</p>
            <p className="text-[#f5f5faf4] text-xl font-semibold">
              {data.statistics.rewardsReleased}
            </p>
          </div>
        </div>
      )} */}

      {/* Table */}
      <div className="rounded-xl border border-[#f5f5fa14] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f5f5fa14]">
              <th className="text-left py-4 px-6 text-[#87858F] text-xs font-medium">
                Contributor
              </th>
              <th className="text-left py-4 px-6 text-[#87858F] text-xs font-medium">
                Status
              </th>
              <th className="text-left py-4 px-6 text-[#87858F] text-xs font-medium">
                <div className="flex items-center gap-1">
                  <span>Verifier Rep.</span>
                  <HiFilter className="w-3 h-3" />
                </div>
              </th>
              <th className="text-left py-4 px-6 text-[#87858F] text-xs font-medium">
                <div className="flex items-center gap-1">
                  <span>Quality</span>
                  <HiFilter className="w-3 h-3" />
                </div>
              </th>
              <th className="text-left py-4 px-6 text-[#87858F] text-xs font-medium">
                Reward
              </th>
              <th className="text-left py-4 px-6 text-[#87858F] text-xs font-medium">
                Submitted
              </th>
              <th className="text-left py-4 px-6 text-[#87858F] text-xs font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f5f5fa14]">
            {filteredData.map((contribution) => (
              <ContributionsTableRow
                key={contribution.contribution_id}
                contribution={
                  {
                    id: contribution.contribution_id,
                    creator: {
                      avatar:
                        'https://pbs.twimg.com/profile_images/1744477796301496320/z7AIB7_W_400x400.jpg',
                      name: `${contribution.contributor.slice(
                        0,
                        6
                      )}...${contribution.contributor.slice(-4)}`,
                      address: contribution.contributor,
                      reputation: contribution.contributor_reputation || 0,
                    },
                    verificationStatus: contribution.is_verified
                      ? 'Verified'
                      : 'Pending',
                    verifierReputation:
                      contribution.verification_scores?.verifier_reputation ||
                      0,
                    qualityScore:
                      contribution.verification_scores?.quality_score || 0,
                    rewardStatus: contribution.reward_released
                      ? 'Released'
                      : 'Pending',
                    dataUrl: contribution.data_url,
                    submittedAt: contribution.timestamp,
                    rewardAmount:
                      data?.additionalInfo?.escrowInfo?.unitReward || 0,
                  } as TableContribution
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredData.length === 0 && (
        <div className="text-center py-8">
          <p className="text-[#f5f5fa7a] text-sm">
            No contributions found matching your criteria
          </p>
        </div>
      )}
    </div>
  );
};

export default ContributionsTable;
