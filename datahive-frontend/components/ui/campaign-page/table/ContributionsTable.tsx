import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import ContributionsTableRow from './ContributionsTableRow';
import { HiFilter } from 'react-icons/hi';
import { useQuery, useQueries, QueryClient } from '@tanstack/react-query';

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
  success: boolean;
  message?: string;
  campaign?: {
    id: string;
    campaignIdString: string;
    title: string;
    creator: string;
    description: string;
    unitPrice: string;
    currentSubmissions: string;
    maxSubmissions: string;
    remainingBudget: string;
    totalBudget: string;
    rewardThreshold: string;
    active: boolean;
  };
  contributions?: Array<{
    id: string;
    contributor: string;
    encryptedDataHash: string;
    metadataURI: string;
    score: number;
    qualified: boolean;
    timestamp: string;
    formattedTime: string;
  }>;
  stats?: {
    totalContributions: number;
    qualifiedCount: number;
    qualifiedPercentage: string;
    averageScore: string;
    thresholdScore: string;
    uniqueContributors: number;
  };
  error?: string;
  errorCode?: string;
}

interface ReputationResponse {
  success: boolean;
  message?: string;
  reputation?: {
    address: string;
    reputation_score: string;
    contribution_count: string;
    successful_payments: string;
    campaign_contribution_count: string;
    has_store: boolean;
    badge_count: string;
    badges: any[];
    next_badges: any[];
  };
  error?: string;
  errorCode?: string;
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
        `/api/campaign/get_campaign_contributions?campaignId=${id}`
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
          (statusFilter === 'Verified' && contribution.qualified) ||
          (statusFilter === 'Pending' && !contribution.qualified);

        return matchesSearch && matchesStatus;
      }) || [],
    [data?.contributions, searchTerm, statusFilter]
  );

  // Get unique contributor addresses for reputation fetching
  const uniqueContributors = useMemo(() => {
    const addresses = new Set<string>();
    filteredData.forEach((contribution) => {
      addresses.add(contribution.contributor);
    });
    return Array.from(addresses);
  }, [filteredData]);

  // Fetch reputation data for all contributors
  const reputationQueries = useQueries({
    queries: uniqueContributors.map((address) => ({
      queryKey: ['reputation', address],
      queryFn: async () => {
        const response = await fetch(
          `/api/campaign/get_user_reputation?address=${address}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch reputation');
        }
        return response.json() as Promise<ReputationResponse>;
      },
      staleTime: 10 * 60 * 1000, // Cache for 10 minutes
      cacheTime: 10 * 60 * 1000, // Cache for 10 minutes
    })),
  });

  // Create a map of address to reputation data
  const reputationMap = useMemo(() => {
    const map = new Map<string, number>();
    reputationQueries.forEach((query) => {
      if (query.data?.success && query.data.reputation) {
        map.set(
          query.data.reputation.address,
          parseInt(query.data.reputation.reputation_score) || 0
        );
      }
    });
    return map;
  }, [reputationQueries]);

  // Memoize the transformed data
  const transformedData = useMemo(
    () =>
      filteredData.map((contribution) => ({
        dataUrl: contribution.metadataURI,
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
      {data?.stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-[#f5f5fa0a]">
            <p className="text-[#f5f5fa7a] text-xs">Total Contributions</p>
            <p className="text-[#f5f5faf4] text-xl font-semibold">
              {data.stats.totalContributions}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#f5f5fa0a]">
            <p className="text-[#f5f5fa7a] text-xs">Verified</p>
            <p className="text-[#f5f5faf4] text-xl font-semibold">
              {data.stats.qualifiedCount}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#f5f5fa0a]">
            <p className="text-[#f5f5fa7a] text-xs">Verification Rate</p>
            <p className="text-[#f5f5faf4] text-xl font-semibold">
              {data.stats.qualifiedPercentage}%
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#f5f5fa0a]">
            <p className="text-[#f5f5fa7a] text-xs">Unique Contributors</p>
            <p className="text-[#f5f5faf4] text-xl font-semibold">
              {data.stats.uniqueContributors}
            </p>
          </div>
        </div>
      )}

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
                  <span>Agent Verifier Rep.</span>
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
                key={contribution.id}
                contribution={
                  {
                    id: contribution.id,
                    creator: {
                      avatar:
                        'https://pbs.twimg.com/profile_images/1744477796301496320/z7AIB7_W_400x400.jpg',
                      name: `${contribution.contributor.slice(
                        0,
                        6
                      )}...${contribution.contributor.slice(-4)}`,
                      address: contribution.contributor,
                      reputation:
                        reputationMap.get(contribution.contributor) || 0,
                    },
                    verificationStatus: contribution.qualified
                      ? 'Verified'
                      : 'Pending',
                    verifierReputation: 0, // This data isn't available in the API
                    qualityScore: contribution.score,
                    rewardStatus: contribution.qualified
                      ? 'Released'
                      : 'Pending',
                    dataUrl: contribution.metadataURI,
                    submittedAt:
                      contribution.formattedTime || contribution.timestamp,
                    rewardAmount: data?.campaign?.unitPrice
                      ? parseFloat(data.campaign.unitPrice)
                      : 0,
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
