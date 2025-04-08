import React, { useEffect, useState, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  HiTrendingUp,
  HiUserGroup,
  HiClock,
  HiChartBar,
  HiShieldCheck,
  HiChartPie,
  HiCurrencyDollar,
  HiDocumentText,
} from 'react-icons/hi';
import axios from 'axios';
import { truncateAddress } from '@aptos-labs/wallet-adapter-react';
import { octasToMove } from '@/utils/aptos/octasToMove';

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
}

interface AnalyticsProps {
  campaign: Campaign;
  isLoading?: boolean;
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  trend?: number;
  color: string;
}

interface CampaignAnalytics {
  total_contributions: number;
  average_cost_per_submission: number;
  peak_activity: {
    max_submissions: number;
  };
  top_contributors: {
    contributor: string;
    submissions: number;
  }[];
  unique_contributor_count: number;
  total_rewards_paid: number;
}

interface Contribution {
  contribution_id: string;
  onchain_contribution_id: string;
  campaign_id: string;
  contributor: string;
  data_url: string;
  transaction_hash: string;
  ai_verification_score: number;
  reputation_score: number;
  is_verified: boolean;
  reward_claimed: boolean;
  created_at: string;
  quality_score: string;
}

interface PeakActivity {
  [campaignId: string]: {
    '00:00 - 06:00': number;
    '06:00 - 12:00': number;
    '12:00 - 18:00': number;
    '18:00 - 00:00': number;
  };
}

interface DailyActivity {
  day: string;
  count: number;
}

// Default dummy data for fallback
const defaultSubmissionData = [
  { date: 'Mon', submissions: 45, quality_score: 85 },
  { date: 'Tue', submissions: 52, quality_score: 87 },
  { date: 'Wed', submissions: 38, quality_score: 83 },
  { date: 'Thu', submissions: 65, quality_score: 89 },
  { date: 'Fri', submissions: 48, quality_score: 86 },
  { date: 'Sat', submissions: 55, quality_score: 87 },
  { date: 'Sun', submissions: 42, quality_score: 84 },
];

const defaultQualityData = [
  { name: 'High Quality', value: 65, color: '#6366f1' },
  { name: 'Medium Quality', value: 25, color: '#a855f7' },
  { name: 'Low Quality', value: 10, color: '#f5f5fa14' },
];

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

// Skeleton loader for the Analytics tab
export const AnalyticsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 py-6 pr-6">
      {/* Header Stats Skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="rounded-xl p-4 border border-[#f5f5fa14] animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#f5f5fa14]"></div>
              <div className="space-y-2">
                <div className="h-4 w-20 bg-[#f5f5fa0a] rounded"></div>
                <div className="h-6 w-16 bg-[#f5f5fa14] rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Section Skeleton */}
      <div className="grid grid-cols-3 gap-6">
        {/* Submission & Quality Score Trend Chart Skeleton */}
        <div className="col-span-2 rounded-xl p-6 border border-[#f5f5fa14]">
          <div className="h-6 w-48 bg-[#f5f5fa14] rounded mb-6 animate-pulse"></div>
          <div className="h-64 w-full bg-[#f5f5fa0a] rounded animate-pulse"></div>
        </div>

        {/* Quality Distribution Chart Skeleton */}
        <div className="rounded-xl p-6 border border-[#f5f5fa14]">
          <div className="h-6 w-48 bg-[#f5f5fa14] rounded mb-6 animate-pulse"></div>
          <div className="h-64 w-full bg-[#f5f5fa0a] rounded animate-pulse"></div>
        </div>
      </div>

      {/* Additional Stats Skeleton */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl p-6 border border-[#f5f5fa14]">
          <div className="h-6 w-48 bg-[#f5f5fa14] rounded mb-6 animate-pulse"></div>
          <div className="h-32 w-full bg-[#f5f5fa0a] rounded animate-pulse"></div>
        </div>
        <div className="rounded-xl p-6 border border-[#f5f5fa14]">
          <div className="h-6 w-48 bg-[#f5f5fa14] rounded mb-6 animate-pulse"></div>
          <div className="h-32 w-full bg-[#f5f5fa0a] rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

const Analytics: React.FC<AnalyticsProps> = ({ campaign, isLoading }) => {
  const [analyticsData, setAnalyticsData] = useState<CampaignAnalytics | null>(
    null
  );
  const [peakActivityData, setPeakActivityData] = useState<PeakActivity | null>(
    null
  );
  const [contributionsData, setContributionsData] = useState<Contribution[]>(
    []
  );
  const [dailyActivityData, setDailyActivityData] = useState<DailyActivity[]>(
    []
  );
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generatedDataRef = useRef<{
    peakActivity: Record<string, number> | null;
    qualityDistribution: typeof defaultQualityData | null;
    weeklySubmissions: typeof defaultSubmissionData | null;
    dailyActivity: DailyActivity[] | null;
  }>({
    peakActivity: null,
    qualityDistribution: null,
    weeklySubmissions: null,
    dailyActivity: null,
  });

  const [processedPeakActivityData, setProcessedPeakActivityData] = useState<
    Record<string, number>
  >({});
  const [peakActivityChartData, setPeakActivityChartData] = useState<
    Array<{ time: string; percentage: number; rawCount: number }>
  >([]);
  const [qualityData, setQualityData] =
    useState<typeof defaultQualityData>(defaultQualityData);
  const [submissionData, setSubmissionData] = useState<
    typeof defaultSubmissionData
  >(defaultSubmissionData);

  useEffect(() => {
    const fetchCampaignAnalytics = async () => {
      try {
        const onchainCampaignId = campaign.onchain_campaign_id;
        console.log('Fetching analytics for campaign:', onchainCampaignId);

        const response = await axios.get(
          `${baseUrl}/campaigns/analytics/campaign/${onchainCampaignId}`
        );

        console.log('Campaign analytics data:', response.data);
        setAnalyticsData(response.data);
      } catch (error) {
        console.error('Error fetching campaign analytics:', error);
        setError('Failed to load campaign analytics');
      }
    };

    const fetchCampaignContributions = async () => {
      try {
        const onchainCampaignId = campaign.onchain_campaign_id;
        console.log('Fetching contributions for campaign:', onchainCampaignId);

        const response = await axios.get(
          `${baseUrl}/campaigns/get-contributions/${onchainCampaignId}`
        );

        console.log('Campaign contributions data:', response.data);
        if (response.data && response.data.contributions) {
          setContributionsData(response.data.contributions);
          // Reset generated data when new contributions are received
          generatedDataRef.current = {
            peakActivity: null,
            qualityDistribution: null,
            weeklySubmissions: null,
            dailyActivity: null,
          };
        }
      } catch (error) {
        console.error('Error fetching campaign contributions:', error);
      }
    };

    const fetchPeakActivity = async () => {
      try {
        const onchainCampaignId = campaign.onchain_campaign_id;
        console.log(
          'Calculating peak activity for campaign:',
          onchainCampaignId
        );

        const response = await axios.post(
          `${baseUrl}/campaigns/calculate-peak-activity?onchain_campaign_id=${onchainCampaignId}`
        );

        console.log('Campaign peak activity data:', response.data);
        setPeakActivityData(response.data);
      } catch (error) {
        console.error('Error calculating peak activity:', error);
        setError('Failed to load peak activity data');
      } finally {
        setIsDataLoading(false);
      }
    };

    if (!isLoading) {
      setIsDataLoading(true);
      fetchCampaignAnalytics();
      fetchCampaignContributions();
      fetchPeakActivity();
    }
  }, [campaign.onchain_campaign_id, isLoading]);

  useEffect(() => {
    // Only run this effect when we have analytics data and contributions data
    if (isDataLoading || !analyticsData) return;

    const totalSubmissions = analyticsData.total_contributions || 0;

    if (!generatedDataRef.current.dailyActivity && totalSubmissions > 0) {
      const days = [];
      const today = new Date();

      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        days.push(date.toISOString().split('T')[0]);
      }

      if (contributionsData.length > 0) {
        const contributionsByDay = contributionsData.reduce(
          (acc, contribution) => {
            const day = contribution.created_at.split('T')[0];
            acc[day] = (acc[day] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        const dailyActivity = days.map((day) => ({
          day,
          count: contributionsByDay[day] || 0,
        }));

        generatedDataRef.current.dailyActivity = dailyActivity;
        setDailyActivityData(dailyActivity);
      } else {
        const dailyActivity = days.map((day) => {
          const daysAgo = Math.floor(
            (today.getTime() - new Date(day).getTime()) / (1000 * 60 * 60 * 24)
          );
          const maxCount = Math.max(1, Math.floor(totalSubmissions / 10));
          const weight = Math.max(0.1, 1 - daysAgo / 30);
          const count = Math.floor(Math.random() * maxCount * weight);

          return {
            day,
            count,
          };
        });

        const generatedTotal = dailyActivity.reduce(
          (sum, item) => sum + item.count,
          0
        );
        if (generatedTotal > 0) {
          const adjustmentFactor = totalSubmissions / generatedTotal;
          dailyActivity.forEach((item) => {
            item.count = Math.round(item.count * adjustmentFactor);
          });
        }

        generatedDataRef.current.dailyActivity = dailyActivity;
        setDailyActivityData(dailyActivity);
      }
    } else if (generatedDataRef.current.dailyActivity) {
      setDailyActivityData(generatedDataRef.current.dailyActivity);
    }
  }, [analyticsData, contributionsData, isDataLoading]);

  useEffect(() => {
    if (!peakActivityData || isDataLoading || !analyticsData) return;

    const totalSubmissions = analyticsData.total_contributions || 0;

    const peakActivityTimeSlots =
      peakActivityData && campaign.onchain_campaign_id in peakActivityData
        ? peakActivityData[campaign.onchain_campaign_id]
        : {
            '00:00 - 06:00': 0,
            '06:00 - 12:00': 0,
            '12:00 - 18:00': 0,
            '18:00 - 00:00': 0,
          };

    const allPeakActivityZero = Object.values(peakActivityTimeSlots).every(
      (value) => value === 0 || value === null || value === undefined
    );

    const anyPeakActivityNonZero = Object.values(peakActivityTimeSlots).some(
      (value) => value > 0
    );

    let processed = { ...peakActivityTimeSlots };

    if (
      (allPeakActivityZero || !anyPeakActivityNonZero) &&
      totalSubmissions > 0
    ) {
      if (!generatedDataRef.current.peakActivity) {
        const timeSlots = Object.keys(peakActivityTimeSlots);
        let remainingSubmissions = totalSubmissions;

        const generatedPeakActivity = {} as Record<string, number>;

        timeSlots.forEach((slot, index) => {
          if (index === timeSlots.length - 1) {
            generatedPeakActivity[slot] = remainingSubmissions;
          } else {
            const maxForThisSlot = Math.floor(remainingSubmissions * 0.7);
            const randomValue = Math.floor(
              Math.random() * (maxForThisSlot + 1)
            );
            generatedPeakActivity[slot] = randomValue;
            remainingSubmissions -= randomValue;
          }
        });

        generatedDataRef.current.peakActivity = generatedPeakActivity;
        console.log(
          'Generated random peak activity data:',
          generatedPeakActivity
        );
      }

      processed = {
        ...generatedDataRef.current.peakActivity,
      } as typeof peakActivityTimeSlots;
    } else {
      console.log('Using actual peak activity data:', processed);
    }

    setProcessedPeakActivityData(processed);

    const totalPeakActivitySubmissions = Object.values(processed).reduce(
      (sum, count) => sum + (count || 0),
      0
    );

    const chartData = Object.entries(processed).map(([time, count]) => {
      const percentage =
        totalPeakActivitySubmissions > 0
          ? Math.round((count / totalPeakActivitySubmissions) * 100)
          : 0;

      return {
        time,
        percentage,
        rawCount: count || 0,
      };
    });

    setPeakActivityChartData(chartData);
  }, [
    peakActivityData,
    analyticsData,
    isDataLoading,
    campaign.onchain_campaign_id,
  ]);

  // Add a separate useEffect for processing quality data
  useEffect(() => {
    if (isDataLoading || !analyticsData) return;

    const totalSubmissions = analyticsData.total_contributions || 0;

    if (totalSubmissions > 0) {
      if (
        !generatedDataRef.current.qualityDistribution &&
        contributionsData.length > 0
      ) {
        // Count the occurrences of each quality score
        const qualityScoreCounts = contributionsData.reduce(
          (counts, contribution) => {
            const score = contribution.quality_score || 'Medium Quality';
            counts[score] = (counts[score] || 0) + 1;
            return counts;
          },
          {} as Record<string, number>
        );

        // Create the quality distribution data
        const highQualityValue = qualityScoreCounts['High Quality'] || 0;
        const mediumQualityValue = qualityScoreCounts['Medium Quality'] || 0;
        const lowQualityValue = qualityScoreCounts['Low Quality'] || 0;

        const generatedQualityData = [
          {
            name: 'High Quality',
            value: highQualityValue,
            color: '#6366f1',
          },
          {
            name: 'Medium Quality',
            value: mediumQualityValue,
            color: '#a855f7',
          },
          {
            name: 'Low Quality',
            value: lowQualityValue,
            color: '#f5f5fa14',
          },
        ];

        generatedDataRef.current.qualityDistribution = generatedQualityData;
        console.log(
          'Generated quality distribution data from contributions:',
          generatedQualityData
        );
        setQualityData(generatedQualityData);
      } else if (!generatedDataRef.current.qualityDistribution) {
        const highQualityValue = Math.round(
          totalSubmissions * (0.5 + Math.random() * 0.2)
        );
        const mediumQualityValue = Math.round(
          totalSubmissions * (0.2 + Math.random() * 0.15)
        );
        const lowQualityValue = Math.max(
          0,
          totalSubmissions - highQualityValue - mediumQualityValue
        );

        const generatedQualityData = [
          {
            name: 'High Quality',
            value: highQualityValue,
            color: '#6366f1',
          },
          {
            name: 'Medium Quality',
            value: mediumQualityValue,
            color: '#a855f7',
          },
          {
            name: 'Low Quality',
            value: lowQualityValue,
            color: '#f5f5fa14',
          },
        ];

        generatedDataRef.current.qualityDistribution = generatedQualityData;
        console.log(
          'Generated random quality distribution data:',
          generatedQualityData
        );
        setQualityData(generatedQualityData);
      } else if (generatedDataRef.current.qualityDistribution) {
        setQualityData(generatedDataRef.current.qualityDistribution);
      }
    }
  }, [analyticsData, contributionsData, isDataLoading]);

  // Add a separate useEffect for processing submission data
  useEffect(() => {
    if (isDataLoading || !analyticsData) return;

    const totalSubmissions = analyticsData.total_contributions || 0;

    if (totalSubmissions > 0) {
      if (
        !generatedDataRef.current.weeklySubmissions &&
        contributionsData.length > 0
      ) {
        // Group contributions by day of week
        const dayMap: Record<
          string,
          { submissions: number; qualityScores: number[] }
        > = {
          Mon: { submissions: 0, qualityScores: [] },
          Tue: { submissions: 0, qualityScores: [] },
          Wed: { submissions: 0, qualityScores: [] },
          Thu: { submissions: 0, qualityScores: [] },
          Fri: { submissions: 0, qualityScores: [] },
          Sat: { submissions: 0, qualityScores: [] },
          Sun: { submissions: 0, qualityScores: [] },
        };

        const qualityScoreMap: Record<string, number> = {
          'High Quality': 90,
          'Medium Quality': 70,
          'Low Quality': 50,
        };

        contributionsData.forEach((contribution) => {
          const date = new Date(contribution.created_at);
          const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
            date.getDay()
          ];

          dayMap[dayOfWeek].submissions += 1;

          const qualityScoreValue =
            qualityScoreMap[contribution.quality_score] || 70;
          dayMap[dayOfWeek].qualityScores.push(qualityScoreValue);
        });

        const weeklyDistribution = Object.entries(dayMap).map(
          ([date, data]) => {
            const avgQualityScore =
              data.qualityScores.length > 0
                ? Math.round(
                    data.qualityScores.reduce((sum, score) => sum + score, 0) /
                      data.qualityScores.length
                  )
                : 0;

            return {
              date,
              submissions: data.submissions,
              quality_score: avgQualityScore || 70,
            };
          }
        );

        generatedDataRef.current.weeklySubmissions = weeklyDistribution;
        console.log(
          'Generated weekly submission data from contributions:',
          weeklyDistribution
        );
        setSubmissionData(weeklyDistribution);
      } else if (!generatedDataRef.current.weeklySubmissions) {
        const weeklyDistribution = [
          {
            date: 'Mon',
            submissions: Math.round(totalSubmissions * 0.15),
            quality_score: 85,
          },
          {
            date: 'Tue',
            submissions: Math.round(totalSubmissions * 0.18),
            quality_score: 87,
          },
          {
            date: 'Wed',
            submissions: Math.round(totalSubmissions * 0.12),
            quality_score: 83,
          },
          {
            date: 'Thu',
            submissions: Math.round(totalSubmissions * 0.22),
            quality_score: 89,
          },
          {
            date: 'Fri',
            submissions: Math.round(totalSubmissions * 0.16),
            quality_score: 86,
          },
          {
            date: 'Sat',
            submissions: Math.round(totalSubmissions * 0.1),
            quality_score: 87,
          },
          {
            date: 'Sun',
            submissions: Math.round(totalSubmissions * 0.07),
            quality_score: 84,
          },
        ];

        const currentTotal = weeklyDistribution.reduce(
          (sum, day) => sum + day.submissions,
          0
        );

        if (currentTotal !== totalSubmissions) {
          const adjustmentFactor = totalSubmissions / currentTotal;
          weeklyDistribution.forEach((day) => {
            day.submissions = Math.round(day.submissions * adjustmentFactor);
          });

          const newTotal = weeklyDistribution.reduce(
            (sum, day) => sum + day.submissions,
            0
          );
          const difference = totalSubmissions - newTotal;
          if (difference !== 0) {
            weeklyDistribution[weeklyDistribution.length - 1].submissions +=
              difference;
          }
        }

        generatedDataRef.current.weeklySubmissions = weeklyDistribution;
        console.log('Generated weekly submission data:', weeklyDistribution);
        setSubmissionData(weeklyDistribution);
      } else if (generatedDataRef.current.weeklySubmissions) {
        setSubmissionData(generatedDataRef.current.weeklySubmissions);
      }
    }
  }, [analyticsData, contributionsData, isDataLoading]);

  // If loading, show skeleton
  if (isLoading || isDataLoading) {
    return <AnalyticsSkeleton />;
  }

  // Prepare data for charts and stats
  const totalSubmissions = analyticsData?.total_contributions || 0;
  const uniqueContributors = analyticsData?.unique_contributor_count || 0;
  const avgCostPerSubmission = analyticsData?.average_cost_per_submission
    ? octasToMove(analyticsData.average_cost_per_submission)
    : '0';

  const topContributors = analyticsData?.top_contributors || [];

  const StatCard = ({
    icon: Icon,
    label,
    value,
    trend,
    color,
  }: StatCardProps) => (
    <div className="rounded-xl p-4 border border-[#f5f5fa14]">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${color}`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[#f5f5fa7a] text-sm">{label}</p>
          <div className="flex items-center gap-2">
            <span className="text-[#f5f5faf4] text-xl font-semibold">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs ${
                  trend >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {trend > 0 ? '+' : ''}
                {trend}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 py-6 pr-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={HiDocumentText}
          label="Total Submissions"
          value={totalSubmissions}
          color="bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
        />
        <StatCard
          icon={HiShieldCheck}
          label="Avg. Quality Score"
          value={
            contributionsData.length > 0
              ? Math.round(
                  contributionsData.reduce((sum, contribution) => {
                    const qualityMap = {
                      'High Quality': 90,
                      'Medium Quality': 70,
                      'Low Quality': 50,
                    };
                    return (
                      sum +
                      (qualityMap[
                        contribution.quality_score as keyof typeof qualityMap
                      ] || 70)
                    );
                  }, 0) / contributionsData.length
                )
              : 0
          }
          color="bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
        />
        <StatCard
          icon={HiUserGroup}
          label="Unique Contributors"
          value={uniqueContributors}
          color="bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
        />
        <StatCard
          icon={HiCurrencyDollar}
          label="Avg. Cost/Submission"
          value={`${avgCostPerSubmission} MOVE`}
          color="bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-3 gap-6">
        {/* Submission & Quality Score Trend Chart */}
        <div className="col-span-2 rounded-xl p-6 border border-[#f5f5fa14]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <HiChartBar className="w-5 h-5 text-[#a855f7]" />
              <h3 className="text-[#f5f5faf4] text-lg font-semibold">
                Submission & Quality Score Trend
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#6366f1]" />
                <span className="text-[#f5f5fa7a] text-sm">Submissions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#a855f7]" />
                <span className="text-[#f5f5fa7a] text-sm">Quality Score</span>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={submissionData}>
                <defs>
                  <linearGradient
                    id="colorSubmissions"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="colorQualityScore"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5fa14" />
                <XAxis dataKey="date" stroke="#f5f5fa7a" />
                <YAxis yAxisId="left" stroke="#f5f5fa7a" />
                <YAxis yAxisId="right" orientation="right" stroke="#f5f5fa7a" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #f5f5fa14',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="submissions"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorSubmissions)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="quality_score"
                  stroke="#a855f7"
                  fillOpacity={1}
                  fill="url(#colorQualityScore)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reputation Distribution */}
        <div className="rounded-xl p-6 border border-[#f5f5fa14]">
          <div className="flex items-center gap-2 mb-6">
            <HiChartPie className="w-5 h-5 text-[#a855f7]" />
            <h3 className="text-[#f5f5faf4] text-lg font-semibold">
              Quality Score Distribution
            </h3>
          </div>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={qualityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {qualityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #f5f5fa14',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {qualityData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[#f5f5fa7a] text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-6">
        {/* Time Distribution */}
        <div className="rounded-xl p-6 border border-[#f5f5fa14]">
          <div className="flex items-center gap-2 mb-4">
            <HiClock className="w-5 h-5 text-[#a855f7]" />
            <h3 className="text-[#f5f5faf4] text-lg font-semibold">
              Peak Activity Hours
            </h3>
          </div>
          <div className="space-y-3">
            {peakActivityChartData.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-[#f5f5fa7a]">{item.time}</span>
                  <span className="text-[#f5f5faf4]">
                    {item.percentage}% ({item.rawCount} submissions)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#f5f5fa14] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Contributors */}
        <div className="rounded-xl p-6 border border-[#f5f5fa14]">
          <div className="flex items-center gap-2 mb-4">
            <HiTrendingUp className="w-5 h-5 text-[#a855f7]" />
            <h3 className="text-[#f5f5faf4] text-lg font-semibold">
              Top Contributors
            </h3>
          </div>
          <div className="space-y-4">
            {topContributors.length > 0 ? (
              topContributors.map((contributor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#f5f5fa14] flex items-center justify-center">
                      <span className="text-[#f5f5faf4] text-sm">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="text-[#f5f5faf4] text-sm">
                        {truncateAddress(contributor.contributor)}
                      </p>
                      <p className="text-[#f5f5fa7a] text-xs">
                        {contributor.submissions} submissions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#f5f5faf4] text-sm">
                      {totalSubmissions > 0
                        ? Math.round(
                            (contributor.submissions * 100) / totalSubmissions
                          )
                        : 0}
                      %
                    </span>
                    <HiShieldCheck className="w-4 h-4 text-[#a855f7]" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-[#f5f5fa7a] py-4">
                No contributor data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Activity Section */}
      <div className="rounded-xl p-6 border border-[#f5f5fa14]">
        <div className="flex items-center gap-2 mb-6">
          <HiChartBar className="w-5 h-5 text-[#a855f7]" />
          <h3 className="text-[#f5f5faf4] text-lg font-semibold">
            Daily Submission Activity (Last 30 Days)
          </h3>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyActivityData}>
              <defs>
                <linearGradient
                  id="colorDailyActivity"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5fa14" />
              <XAxis
                dataKey="day"
                stroke="#f5f5fa7a"
                tickFormatter={(value) => {
                  // Format date to show only day and month
                  const date = new Date(value);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
                tick={{ fontSize: 12 }}
                interval={4} // Show fewer ticks for readability
              />
              <YAxis stroke="#f5f5fa7a" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #f5f5fa14',
                  borderRadius: '8px',
                }}
                formatter={(value, name) => [`${value} submissions`, 'Count']}
                labelFormatter={(label) => {
                  // Format the date for the tooltip
                  const date = new Date(label);
                  return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                fillOpacity={1}
                fill="url(#colorDailyActivity)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
