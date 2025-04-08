import React from 'react';
import {
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineChartBar,
  HiOutlineUserGroup,
  HiOutlineClipboardCheck,
  HiOutlineTrendingUp,
  HiOutlineCash,
} from 'react-icons/hi';
import StatCard from './StatCard';
import { octasToMove } from '@/utils/aptos/octasToMove';

interface ProfileStats {
  campaignsCreated: number | string;
  campaignsEarnings: number | string;
  contributionsMade: number | string;
  contributionsEarnings: number | string;
  reputationScore: number | string;
}

interface ActivityData {
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

interface FinancialStats {
  totalSpent: number;
  totalEarned: number;
  netPosition: number;
}

interface StatsGridProps {
  stats: ProfileStats;
  activityData?: ActivityData;
  statsData?: FinancialStats;
}

const StatsGrid: React.FC<StatsGridProps> = ({
  stats,
  activityData,
  statsData,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
      <StatCard
        icon={<HiOutlineDocumentText className="w-6 h-6 text-[#6366f1]" />}
        label="Campaigns Created"
        value={stats.campaignsCreated}
        subValue={
          activityData
            ? `Active campaigns: ${activityData.campaigns.active} (${Math.round(
                activityData.campaigns.activeRate
              )}%)`
            : 'Active campaigns: 5'
        }
      />
      <StatCard
        icon={<HiOutlineCurrencyDollar className="w-6 h-6 text-[#22c55e]" />}
        label="Amount Spent on Campaigns"
        value={stats.campaignsEarnings}
        subValue={
          statsData
            ? `Total transactions: ${
                Number(statsData.totalSpent) > 0
                  ? octasToMove(Number(statsData.totalSpent))
                  : 0
              }`
            : undefined
        }
      />
      <StatCard
        icon={<HiOutlineClipboardCheck className="w-6 h-6 text-[#a855f7]" />}
        label="Contributions Made"
        value={stats.contributionsMade}
        subValue={
          activityData
            ? `Verified: ${activityData.contributions.verified} (${Math.round(
                activityData.contributions.successRate
              )}%)`
            : 'Accepted: 42 (93%)'
        }
      />
      <StatCard
        icon={<HiOutlineCurrencyDollar className="w-6 h-6 text-[#22c55e]" />}
        label="Amount Earned from Contributions"
        value={stats.contributionsEarnings}
        subValue={
          statsData
            ? `Average per contribution: ${
                Number(stats.contributionsMade) > 0
                  ? Math.round(
                      Number(stats.contributionsEarnings) /
                        Number(stats.contributionsMade)
                    )
                  : 0
              } MOVE`
            : undefined
        }
      />
      <StatCard
        icon={<HiOutlineChartBar className="w-6 h-6 text-[#6366f1]" />}
        label="Reputation Score"
        value={stats.reputationScore}
        subValue={
          Number(stats.reputationScore) >= 1000
            ? 'Top 5% of contributors'
            : Number(stats.reputationScore) >= 500
            ? 'Top 15% of contributors'
            : 'Growing reputation'
        }
      />

      {!statsData && (
        <StatCard
          icon={<HiOutlineUserGroup className="w-6 h-6 text-[#a855f7]" />}
          label="Community Impact"
          value="High"
          subValue="Trusted community member"
        />
      )}
    </div>
  );
};

export default StatsGrid;
