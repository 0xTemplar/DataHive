import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import ReputationABI from '../../../abi/Reputation.json';

interface UserReputationData {
  address: string;
  reputation_score: string;
  contribution_count: string;
  successful_payments: string;
  campaign_contribution_count: string;
  has_store: boolean;
  badge_count: string;
  badges: Badge[];
  next_badges: BadgeProgress[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  score_threshold: string;
  contribution_threshold: string;
  payment_threshold: string;
  campaign_contribution_threshold: string;
}

interface BadgeProgress {
  id: string;
  name: string;
  description: string;
  score_threshold: string;
  contribution_threshold: string;
  payment_threshold: string;
  campaign_contribution_threshold: string;
  score_progress: number;
  contribution_progress: number;
  payment_progress: number;
  campaign_progress: number;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  reputation?: UserReputationData;
  error?: string;
  errorCode?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { address } = req.query;

    if (!address) {
      return res
        .status(400)
        .json({ success: false, error: 'User address is required' });
    }

    const userAddress = Array.isArray(address) ? address[0] : address;

    if (!ethers.isAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format',
        errorCode: 'INVALID_ADDRESS',
      });
    }

    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'
    );

    let reputationAddress;

    try {
      reputationAddress = process.env.NEXT_PUBLIC_REPUTATION_ADDRESS;

      if (!reputationAddress) {
        throw new Error('Reputation contract address not found');
      }
    } catch (error) {
      console.error('Error loading reputation contract address:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to load contract address configuration',
      });
    }

    const reputationContract = new ethers.Contract(
      reputationAddress,
      ReputationABI,
      provider
    );

    // Check if user has a reputation store
    const hasStore = await reputationContract.hasReputationStore(userAddress);

    // Initialize default response for users without reputation
    const reputationData: UserReputationData = {
      address: userAddress,
      reputation_score: '0',
      contribution_count: '0',
      successful_payments: '0',
      campaign_contribution_count: '0',
      has_store: hasStore,
      badge_count: '0',
      badges: [],
      next_badges: [],
    };

    if (!hasStore) {
      // Return default values for users without reputation
      return res.status(200).json({
        success: true,
        message: 'User has no reputation data yet',
        reputation: reputationData,
      });
    }

    // Fetch basic reputation data
    const [
      reputationScore,
      contributionCount,
      paymentCount,
      campaignContributionCount,
      badgeIds,
      badgeCount,
    ] = await Promise.all([
      reputationContract.getReputationScore(userAddress),
      reputationContract.getContributionCount(userAddress),
      reputationContract.getSuccessfulPayments(userAddress),
      reputationContract.getCampaignContributionCount(userAddress),
      reputationContract.getBadges(userAddress),
      reputationContract.getBadgeCount(userAddress),
    ]);

    // Update reputation data with fetched values
    reputationData.reputation_score = reputationScore.toString();
    reputationData.contribution_count = contributionCount.toString();
    reputationData.successful_payments = paymentCount.toString();
    reputationData.campaign_contribution_count =
      campaignContributionCount.toString();
    reputationData.badge_count = badgeCount.toString();

    // Convert badge IDs to BigInt for internal use
    const userBadgeIds = badgeIds.map((id: string) => BigInt(id));

    // Create a Set of earned badge IDs for easier checking
    const earnedBadgeSet = new Set(
      userBadgeIds.map((id: bigint) => id.toString())
    );

    // Fetch earned badges
    if (badgeIds.length > 0) {
      const badges: Badge[] = await Promise.all(
        badgeIds.map(async (badgeId: string) => {
          const badge = await reputationContract.badges(badgeId);
          return {
            id: badgeId.toString(),
            name: badge.name,
            description: badge.description,
            score_threshold: badge.scoreThreshold.toString(),
            contribution_threshold: badge.contributionThreshold.toString(),
            payment_threshold: badge.paymentThreshold.toString(),
            campaign_contribution_threshold:
              badge.campaignContributionThreshold.toString(),
          };
        })
      );
      reputationData.badges = badges;
    }

    // Fetch all badges to check progress toward next badges
    let badgeIndex = 0;
    const nextBadges: BadgeProgress[] = [];

    // Loop until we find no more badges (will catch errors when we reach the end)
    while (true) {
      try {
        const badge = await reputationContract.badges(badgeIndex);

        // Skip badges the user already has
        if (!earnedBadgeSet.has(badgeIndex.toString())) {
          const scoreThreshold = Number(badge.scoreThreshold);
          const contribThreshold = Number(badge.contributionThreshold);
          const paymentThreshold = Number(badge.paymentThreshold);
          const campaignThreshold = Number(badge.campaignContributionThreshold);

          // Calculate progress percentages
          const scoreProgress = Math.min(
            100,
            scoreThreshold > 0
              ? Math.floor((Number(reputationScore) / scoreThreshold) * 100)
              : 100
          );

          const contribProgress = Math.min(
            100,
            contribThreshold > 0
              ? Math.floor((Number(contributionCount) / contribThreshold) * 100)
              : 100
          );

          const paymentProgress = Math.min(
            100,
            paymentThreshold > 0
              ? Math.floor((Number(paymentCount) / paymentThreshold) * 100)
              : 100
          );

          const campaignProgress = Math.min(
            100,
            campaignThreshold > 0
              ? Math.floor(
                  (Number(campaignContributionCount) / campaignThreshold) * 100
                )
              : 100
          );

          nextBadges.push({
            id: badgeIndex.toString(),
            name: badge.name,
            description: badge.description,
            score_threshold: badge.scoreThreshold.toString(),
            contribution_threshold: badge.contributionThreshold.toString(),
            payment_threshold: badge.paymentThreshold.toString(),
            campaign_contribution_threshold:
              badge.campaignContributionThreshold.toString(),
            score_progress: scoreProgress,
            contribution_progress: contribProgress,
            payment_progress: paymentProgress,
            campaign_progress: campaignProgress,
          });
        }

        badgeIndex++;
      } catch (error) {
        break;
      }
    }

    reputationData.next_badges = nextBadges;

    return res.status(200).json({
      success: true,
      message: 'Reputation data retrieved successfully',
      reputation: reputationData,
    });
  } catch (error) {
    console.error('Error retrieving user reputation:', error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
      errorCode: 'SERVER_ERROR',
    });
  }
}
