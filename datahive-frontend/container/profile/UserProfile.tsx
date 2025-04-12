import React, { useState } from 'react';
import {
  HiOutlineShieldCheck,
  HiOutlineChartBar,
  HiOutlineDocumentText,
  HiOutlineCurrencyDollar,
  HiOutlineClipboardCheck,
  HiOutlineUserGroup,
  HiOutlineBadgeCheck,
  HiOutlineStar,
  HiOutlineSparkles,
  HiSparkles,
  HiOutlineCalendar,
  HiOutlineRefresh,
  HiOutlineBadgeCheck as HiOutlineVerified,
  HiOutlineLightningBolt,
} from 'react-icons/hi';
import ProfileBanner from '@/components/ui/profile/ProfileBanner';
import StatsGrid from '@/components/ui/profile/StatsGrid';
import BadgeGrid from '@/components/ui/profile/BadgeGrid';
import { octasToMove } from '@/utils/aptos/octasToMove';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { truncateAddress } from '@aptos-labs/wallet-adapter-react';
import { useSubscription } from '@/context/SubscriptionContext';

const getBadgeIcon = (badgeType: number) => {
  // Contributor badges
  if (badgeType >= 1 && badgeType <= 3) {
    return <HiOutlineClipboardCheck className="w-6 h-6" />;
  }
  // Campaign creator badges
  if (badgeType >= 10 && badgeType <= 13) {
    return <HiOutlineDocumentText className="w-6 h-6" />;
  }
  // Verifier badges
  if (badgeType >= 20 && badgeType <= 22) {
    return <HiOutlineShieldCheck className="w-6 h-6" />;
  }
  // Achievement badges
  if (badgeType >= 30 && badgeType <= 32) {
    return <HiOutlineStar className="w-6 h-6" />;
  }
  // Default
  return <HiOutlineBadgeCheck className="w-6 h-6" />;
};

// Badge color mapping based on badge type
const getBadgeColor = (badgeType: number) => {
  // Contributor badges
  if (badgeType >= 1 && badgeType <= 3) {
    return 'from-blue-500 to-purple-500';
  }
  // Campaign creator badges
  if (badgeType >= 10 && badgeType <= 13) {
    return 'from-green-500 to-emerald-500';
  }
  // Verifier badges
  if (badgeType >= 20 && badgeType <= 22) {
    return 'from-yellow-500 to-amber-500';
  }
  // Achievement badges
  if (badgeType >= 30 && badgeType <= 32) {
    return 'from-purple-500 to-pink-500';
  }
  // Default
  return 'from-indigo-500 to-blue-500';
};

// Badge description mapping
const getBadgeDescription = (badgeType: number) => {
  switch (badgeType) {
    // Contributor badges
    case 1:
      return 'Contributed to multiple campaigns';
    case 2:
      return 'Consistently high-quality contributions';
    case 3:
      return 'Expert-level contributions to the platform';

    // Campaign creator badges
    case 10:
      return 'Created campaigns on the platform';
    case 11:
      return 'Consistently pays contributors on time';
    case 12:
      return 'Created multiple successful campaigns';
    case 13:
      return 'Expert-level campaign creation and management';

    // Verifier badges
    case 20:
      return 'Verified contributions on the platform';
    case 21:
      return 'Trusted by the community for fair verification';
    case 22:
      return 'Expert-level verification skills';

    // Achievement badges
    case 30:
      return 'Completed first contribution on the platform';
    case 31:
      return 'Created first campaign on the platform';
    case 32:
      return 'Completed first verification on the platform';

    default:
      return 'Achievement unlocked on the DataHive platform';
  }
};

// API fetching functions
const fetchUserBadges = async (address: string) => {
  const response = await fetch(
    `/api/reputation/getUserBadges?address=${address}`
  );
  // Always return the JSON response, even if it contains default/empty data
  return response.json();
};

const fetchUserActivity = async (address: string) => {
  const response = await fetch(
    `/api/reputation/getUserActivity?address=${address}`
  );
  // Always return the JSON response, even if it contains default/empty data
  return response.json();
};

const fetchUserStats = async (address: string) => {
  const response = await fetch(
    `/api/reputation/getUserStats?address=${address}`
  );
  // Always return the JSON response, even if it contains default/empty data
  return response.json();
};

const fetchBadgeProgression = async (address: string) => {
  const response = await fetch(
    `/api/campaign/get_profile_activity?address=${address}`
  );
  return response.json();
};

const UserProfile = () => {
  const { address } = useAccount();
  const walletAddress = address;
  const username = 'Anon';
  const { isSubscribed, subscriptionStatus } = useSubscription();
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);

  const {
    data: badgeData,
    isLoading: isBadgeLoading,
    error: badgeError,
  } = useQuery({
    queryKey: ['userBadges', walletAddress],
    queryFn: () => fetchUserBadges(walletAddress as string),
    enabled: !!walletAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const {
    data: activityData,
    isLoading: isActivityLoading,
    error: activityError,
  } = useQuery({
    queryKey: ['userActivity', walletAddress],
    queryFn: () => fetchUserActivity(walletAddress as string),
    enabled: !!walletAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch financial stats
  const {
    data: statsData,
    isLoading: isStatsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['userStats', walletAddress],
    queryFn: () => fetchUserStats(walletAddress as string),
    enabled: !!walletAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch badge progression data
  const {
    data: badgeProgressionData,
    isLoading: isBadgeProgressionLoading,
    error: badgeProgressionError,
  } = useQuery({
    queryKey: ['badgeProgression', walletAddress],
    queryFn: () => fetchBadgeProgression(walletAddress as string),
    enabled: !!walletAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const isLoading =
    isBadgeLoading ||
    isActivityLoading ||
    isStatsLoading ||
    isBadgeProgressionLoading;
  const error =
    badgeError || activityError || statsError || badgeProgressionError;

  // Transform badge data for BadgeGrid component
  const transformedBadges =
    badgeData?.reputationInfo?.badges?.map((badge: any) => ({
      id: `badge-${badge.type}`,
      name: badge.name,
      description: getBadgeDescription(badge.type),
      icon: getBadgeIcon(badge.type),
      color: getBadgeColor(badge.type),
      earnedDate: new Date(badge.earnedDate).toLocaleDateString(),
    })) || [];

  const profileStats = {
    campaignsCreated: octasToMove(activityData?.stats?.campaigns?.total || 0),
    campaignsEarnings: octasToMove(statsData?.stats?.totalSpent || 0),
    contributionsMade: octasToMove(
      activityData?.stats?.contributions?.total || 0
    ),
    contributionsEarnings: octasToMove(statsData?.stats?.totalEarned || 0),
    reputationScore: badgeData?.reputationInfo?.reputationScore || 0,
  };

  // Format subscription end date if available
  const formatSubscriptionEndDate = () => {
    if (!subscriptionStatus?.endTime) return null;

    const endDate = new Date(subscriptionStatus.endTime);
    return endDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate days remaining until subscription expires
  const getDaysRemaining = () => {
    if (!subscriptionStatus?.endTime) return null;

    const endDate = new Date(subscriptionStatus.endTime);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div className="lg:max-w-[1100px] max-w-[1512px] text-white mt-20">
      <ProfileBanner
        walletAddress={walletAddress && truncateAddress(walletAddress)}
        username={username}
        reputationScore={badgeData?.reputationInfo?.reputationScore}
      />

      <div className="max-w-7xl mx-auto px-8 pt-24">
        {/* Enhanced Subscription Status Banner */}
        {isSubscribed && (
          <div className="mb-8 overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#6366f1]/20 to-[#a855f7]/20 rounded-xl border border-[#a855f7]/30 shadow-lg">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#6366f1] to-[#a855f7] rounded-full opacity-10 -mr-10 -mt-10"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#6366f1] to-[#a855f7] rounded-full opacity-10 -ml-10 -mb-10"></div>

              <div className="relative p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] p-0.5">
                        <div className="w-full h-full rounded-full bg-[#0f0f17] flex items-center justify-center">
                          <HiSparkles className="h-8 w-8 text-[#a855f7]" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center">
                        <h3 className="text-xl font-bold text-white">
                          Premium Membership
                        </h3>
                        <span className="ml-3 px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-[#22c55e]/80 to-[#16a34a]/80 text-white">
                          Active
                        </span>
                      </div>

                      <p className="text-[#f5f5fa7a] mt-1">
                        Enjoy exclusive features and benefits with your{' '}
                        {subscriptionStatus?.subscriptionType || 'Premium'}{' '}
                        subscription
                      </p>

                      <button
                        onClick={() =>
                          setShowSubscriptionDetails(!showSubscriptionDetails)
                        }
                        className="mt-2 text-sm text-[#a855f7] hover:text-[#6366f1] transition-colors flex items-center"
                      >
                        {showSubscriptionDetails
                          ? 'Hide details'
                          : 'View details'}
                        <svg
                          className={`ml-1 h-4 w-4 transition-transform ${
                            showSubscriptionDetails ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Subscription status card */}
                  <div className="mt-4 md:mt-0 flex-shrink-0">
                    <div className="bg-[#f5f5fa0a] backdrop-blur-sm rounded-lg p-3 border border-[#f5f5fa14]">
                      {daysRemaining !== null && (
                        <div className="text-center">
                          <span className="text-2xl font-bold text-white">
                            {daysRemaining}
                          </span>
                          <p className="text-xs text-[#f5f5fa7a]">
                            days remaining
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable details section */}
                {showSubscriptionDetails && (
                  <div className="mt-6 pt-4 border-t border-[#f5f5fa14] grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-3 bg-[#f5f5fa0a] rounded-lg p-3">
                      <div className="w-8 h-8 rounded-full bg-[#6366f1]/20 flex items-center justify-center">
                        <HiOutlineCalendar className="h-4 w-4 text-[#6366f1]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#f5f5fa7a]">Expires on</p>
                        <p className="text-sm font-medium text-white">
                          {formatSubscriptionEndDate() || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 bg-[#f5f5fa0a] rounded-lg p-3">
                      <div className="w-8 h-8 rounded-full bg-[#a855f7]/20 flex items-center justify-center">
                        <HiOutlineRefresh className="h-4 w-4 text-[#a855f7]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#f5f5fa7a]">Auto-renewal</p>
                        <p className="text-sm font-medium text-white">
                          {subscriptionStatus?.autoRenew
                            ? 'Enabled'
                            : 'Disabled'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 bg-[#f5f5fa0a] rounded-lg p-3">
                      <div className="w-8 h-8 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
                        <HiOutlineVerified className="h-4 w-4 text-[#22c55e]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#f5f5fa7a]">
                          Subscription type
                        </p>
                        <p className="text-sm font-medium text-white">
                          {subscriptionStatus?.subscriptionType || 'Premium'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-[#f5f5fa0a] rounded-xl p-6 border border-[#f5f5fa14] h-32"
                >
                  <div className="animate-pulse flex space-x-4">
                    <div className="rounded-full bg-[#f5f5fa14] h-12 w-12"></div>
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-[#f5f5fa14] rounded w-3/4"></div>
                      <div className="h-6 bg-[#f5f5fa14] rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="h-8 bg-[#f5f5fa14] rounded w-64"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-[#f5f5fa0a] rounded-xl p-6 border border-[#f5f5fa14] h-32"
                  >
                    <div className="animate-pulse flex space-x-4">
                      <div className="rounded-xl bg-[#f5f5fa14] h-12 w-12"></div>
                      <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-[#f5f5fa14] rounded w-3/4"></div>
                        <div className="h-4 bg-[#f5f5fa14] rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              Error: {(error as Error).message}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#6366f1] rounded-lg hover:bg-[#4f46e5] transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <StatsGrid
              stats={profileStats}
              activityData={activityData?.stats}
              statsData={statsData?.stats}
            />

            {/* Show earned badges */}
            <BadgeGrid badges={transformedBadges} />

            {/* Enhanced Badge Progression Section */}
            {badgeProgressionData?.badgeProgression && (
              <div className="mb-12">
                <h2 className="text-xl font-bold mb-6">Badge Progression</h2>

                {/* Stats Summary */}
                <div className="bg-[#f5f5fa0a] rounded-xl p-6 border border-[#f5f5fa14] mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-[#f5f5fa7a]">
                        Reputation Score
                      </p>
                      <p className="text-xl font-bold">
                        {
                          badgeProgressionData.badgeProgression.stats
                            .reputationScore
                        }
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-[#f5f5fa7a]">Contributions</p>
                      <p className="text-xl font-bold">
                        {
                          badgeProgressionData.badgeProgression.stats
                            .contributionCount
                        }
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-[#f5f5fa7a]">Payments</p>
                      <p className="text-xl font-bold">
                        {
                          badgeProgressionData.badgeProgression.stats
                            .paymentCount
                        }
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-[#f5f5fa7a]">
                        Campaign Contributions
                      </p>
                      <p className="text-xl font-bold">
                        {
                          badgeProgressionData.badgeProgression.stats
                            .campaignContributionCount
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Next Focus Badge */}
                {badgeProgressionData.badgeProgression.nextFocusBadge && (
                  <div className="bg-[#f5f5fa0a] rounded-xl p-6 border border-[#f5f5fa14] mb-6">
                    <h3 className="font-bold text-lg mb-3 flex items-center">
                      <HiOutlineLightningBolt className="w-5 h-5 mr-2 text-yellow-400" />
                      Next Badge Focus
                    </h3>
                    <div className="mb-4">
                      <h4 className="font-semibold text-base">
                        {
                          badgeProgressionData.badgeProgression.nextFocusBadge
                            .name
                        }
                      </h4>
                      <p className="text-sm text-[#f5f5fa7a]">
                        {
                          badgeProgressionData.badgeProgression.nextFocusBadge
                            .description
                        }
                      </p>
                    </div>

                    {/* Progress bars */}
                    <div className="space-y-4">
                      {Number(
                        badgeProgressionData.badgeProgression.nextFocusBadge
                          .requirements.score
                      ) > 0 && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Reputation Score</span>
                            <span>
                              {
                                badgeProgressionData.badgeProgression.stats
                                  .reputationScore
                              }{' '}
                              /{' '}
                              {
                                badgeProgressionData.badgeProgression
                                  .nextFocusBadge.requirements.score
                              }
                            </span>
                          </div>
                          <div className="w-full bg-[#f5f5fa14] rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
                              style={{
                                width: `${badgeProgressionData.badgeProgression.nextFocusBadge.progress.score}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {Number(
                        badgeProgressionData.badgeProgression.nextFocusBadge
                          .requirements.contributions
                      ) > 0 && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Contributions</span>
                            <span>
                              {
                                badgeProgressionData.badgeProgression.stats
                                  .contributionCount
                              }{' '}
                              /{' '}
                              {
                                badgeProgressionData.badgeProgression
                                  .nextFocusBadge.requirements.contributions
                              }
                            </span>
                          </div>
                          <div className="w-full bg-[#f5f5fa14] rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                              style={{
                                width: `${badgeProgressionData.badgeProgression.nextFocusBadge.progress.contributions}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {Number(
                        badgeProgressionData.badgeProgression.nextFocusBadge
                          .requirements.payments
                      ) > 0 && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Payments</span>
                            <span>
                              {
                                badgeProgressionData.badgeProgression.stats
                                  .paymentCount
                              }{' '}
                              /{' '}
                              {
                                badgeProgressionData.badgeProgression
                                  .nextFocusBadge.requirements.payments
                              }
                            </span>
                          </div>
                          <div className="w-full bg-[#f5f5fa14] rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                              style={{
                                width: `${badgeProgressionData.badgeProgression.nextFocusBadge.progress.payments}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {Number(
                        badgeProgressionData.badgeProgression.nextFocusBadge
                          .requirements.campaignContributions
                      ) > 0 && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Campaign Contributions</span>
                            <span>
                              {
                                badgeProgressionData.badgeProgression.stats
                                  .campaignContributionCount
                              }{' '}
                              /{' '}
                              {
                                badgeProgressionData.badgeProgression
                                  .nextFocusBadge.requirements
                                  .campaignContributions
                              }
                            </span>
                          </div>
                          <div className="w-full bg-[#f5f5fa14] rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500"
                              style={{
                                width: `${badgeProgressionData.badgeProgression.nextFocusBadge.progress.campaignContributions}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Next steps */}
                    {badgeProgressionData.badgeProgression.nextSteps &&
                      badgeProgressionData.badgeProgression.nextSteps.length >
                        0 && (
                        <div className="mt-6">
                          <h4 className="font-semibold mb-2">Next Steps:</h4>
                          <ul className="list-disc pl-5 space-y-1 text-sm">
                            {badgeProgressionData.badgeProgression.nextSteps.map(
                              (step, index) => (
                                <li key={index}>{step}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                )}

                {/* Unearned Badges Grid */}
                {badgeProgressionData.badgeProgression.unearnedBadges.length >
                  0 && (
                  <div>
                    <h3 className="font-bold text-lg mb-4">Badges to Earn</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {badgeProgressionData.badgeProgression.unearnedBadges
                        .slice(0, 6)
                        .map((badge) => (
                          <div
                            key={badge.id}
                            className="bg-[#f5f5fa0a] rounded-xl p-4 border border-[#f5f5fa14] hover:border-[#f5f5fa29] transition-all"
                          >
                            <h4 className="font-semibold">{badge.name}</h4>
                            <p className="text-sm text-[#f5f5fa7a] mb-3">
                              {badge.description}
                            </p>

                            <div className="space-y-2">
                              {/* Display the most relevant progress bar */}
                              {(() => {
                                const progressTypes = [
                                  {
                                    type: 'score',
                                    value: Number(badge.requirements.score),
                                    progress: badge.progress.score,
                                  },
                                  {
                                    type: 'contributions',
                                    value: Number(
                                      badge.requirements.contributions
                                    ),
                                    progress: badge.progress.contributions,
                                  },
                                  {
                                    type: 'payments',
                                    value: Number(badge.requirements.payments),
                                    progress: badge.progress.payments,
                                  },
                                  {
                                    type: 'campaignContributions',
                                    value: Number(
                                      badge.requirements.campaignContributions
                                    ),
                                    progress:
                                      badge.progress.campaignContributions,
                                  },
                                ].filter((item) => item.value > 0);

                                const lowestProgress = progressTypes.reduce(
                                  (prev, curr) =>
                                    prev.progress < curr.progress ? prev : curr,
                                  { type: '', value: 0, progress: 100 }
                                );

                                if (lowestProgress.type) {
                                  let colorClass = '';
                                  let label = '';
                                  let current = '';
                                  let target = '';

                                  switch (lowestProgress.type) {
                                    case 'score':
                                      colorClass =
                                        'bg-gradient-to-r from-[#6366f1] to-[#a855f7]';
                                      label = 'Reputation Score';
                                      current =
                                        badgeProgressionData.badgeProgression
                                          .stats.reputationScore;
                                      target = badge.requirements.score;
                                      break;
                                    case 'contributions':
                                      colorClass =
                                        'bg-gradient-to-r from-blue-500 to-purple-500';
                                      label = 'Contributions';
                                      current =
                                        badgeProgressionData.badgeProgression
                                          .stats.contributionCount;
                                      target = badge.requirements.contributions;
                                      break;
                                    case 'payments':
                                      colorClass =
                                        'bg-gradient-to-r from-green-500 to-emerald-500';
                                      label = 'Payments';
                                      current =
                                        badgeProgressionData.badgeProgression
                                          .stats.paymentCount;
                                      target = badge.requirements.payments;
                                      break;
                                    case 'campaignContributions':
                                      colorClass =
                                        'bg-gradient-to-r from-yellow-500 to-amber-500';
                                      label = 'Campaign Contributions';
                                      current =
                                        badgeProgressionData.badgeProgression
                                          .stats.campaignContributionCount;
                                      target =
                                        badge.requirements
                                          .campaignContributions;
                                      break;
                                  }

                                  return (
                                    <div>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span>{label}</span>
                                        <span>
                                          {current} / {target}
                                        </span>
                                      </div>
                                      <div className="w-full bg-[#f5f5fa14] rounded-full h-1.5">
                                        <div
                                          className={`h-1.5 rounded-full ${colorClass}`}
                                          style={{
                                            width: `${lowestProgress.progress}%`,
                                          }}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                }

                                return null;
                              })()}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Legacy Badge Progress Section */}
            {badgeData?.reputationInfo?.badgeProgress && (
              <div className="mb-12">
                <h2 className="text-xl font-bold mb-6">Reputation Progress</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {badgeData.reputationInfo.badgeProgress.map(
                    (progress: any, index: number) => (
                      <div
                        key={`progress-${index}`}
                        className="bg-[#f5f5fa0a] rounded-xl p-6 border border-[#f5f5fa14] hover:border-[#f5f5fa29] transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{progress.badge}</h3>
                          <span className="text-sm text-[#f5f5fa7a]">
                            {progress.progress} / {progress.threshold} points
                          </span>
                        </div>
                        <div className="w-full bg-[#f5f5fa14] rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${
                              progress.progressPercentage >= 100
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                : 'bg-gradient-to-r from-[#6366f1] to-[#a855f7]'
                            }`}
                            style={{ width: `${progress.progressPercentage}%` }}
                          ></div>
                        </div>
                        <div className="mt-2 text-right text-sm text-[#f5f5fa7a]">
                          {progress.progressPercentage >= 100
                            ? 'Achieved!'
                            : `${Math.round(
                                progress.progressPercentage
                              )}% complete`}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
