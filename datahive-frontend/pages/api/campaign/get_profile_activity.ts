import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import ReputationABI from '../../../abi/Reputation.json';

interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  requirements: {
    score: string;
    contributions: string;
    payments: string;
    campaignContributions: string;
  };
  progress: {
    score: number;
    contributions: number;
    payments: number;
    campaignContributions: number;
  };
  isEarned: boolean;
}

interface BadgeProgressionData {
  address: string;
  stats: {
    reputationScore: string;
    contributionCount: string;
    paymentCount: string;
    campaignContributionCount: string;
    badgeCount: string;
  };
  earnedBadges: BadgeInfo[];
  unearnedBadges: BadgeInfo[];
  nextFocusBadge?: BadgeInfo;
  nextSteps?: string[];
}

interface ApiResponse {
  success: boolean;
  message?: string;
  badgeProgression?: BadgeProgressionData;
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

    const reputation = new ethers.Contract(
      reputationAddress,
      ReputationABI,
      provider
    );

    // Check if the address has a reputation store
    const hasStore = await reputation.hasReputationStore(userAddress);

    if (!hasStore) {
      return res.status(200).json({
        success: true,
        message: `No reputation data found for address ${userAddress}`,
        badgeProgression: {
          address: userAddress,
          stats: {
            reputationScore: '0',
            contributionCount: '0',
            paymentCount: '0',
            campaignContributionCount: '0',
            badgeCount: '0',
          },
          earnedBadges: [],
          unearnedBadges: [],
        },
      });
    }

    // Get user's reputation stats
    const [
      reputationScore,
      contributionCount,
      paymentCount,
      campaignContributionCount,
      earnedBadges,
      badgeCount,
    ] = await Promise.all([
      reputation.getReputationScore(userAddress),
      reputation.getContributionCount(userAddress),
      reputation.getSuccessfulPayments(userAddress),
      reputation.getCampaignContributionCount(userAddress),
      reputation.getBadges(userAddress),
      reputation.getBadgeCount(userAddress),
    ]);

    // Create a set of earned badge IDs for easier checking
    const earnedBadgeSet = new Set(
      earnedBadges.map((id: any) => id.toString())
    );

    // Get all available badges and their progress
    const allBadges: BadgeInfo[] = [];
    let badgeIndex = 0;

    // Collect all badges
    while (true) {
      try {
        const badge = await reputation.badges(badgeIndex);

        const badgeInfo: BadgeInfo = {
          id: badgeIndex.toString(),
          name: badge.name,
          description: badge.description,
          requirements: {
            score: badge.scoreThreshold.toString(),
            contributions: badge.contributionThreshold.toString(),
            payments: badge.paymentThreshold.toString(),
            campaignContributions:
              badge.campaignContributionThreshold.toString(),
          },
          progress: {
            score:
              badge.scoreThreshold > 0
                ? Math.min(
                    100,
                    Math.floor(
                      (Number(reputationScore) / Number(badge.scoreThreshold)) *
                        100
                    )
                  )
                : 100,
            contributions:
              badge.contributionThreshold > 0
                ? Math.min(
                    100,
                    Math.floor(
                      (Number(contributionCount) /
                        Number(badge.contributionThreshold)) *
                        100
                    )
                  )
                : 100,
            payments:
              badge.paymentThreshold > 0
                ? Math.min(
                    100,
                    Math.floor(
                      (Number(paymentCount) / Number(badge.paymentThreshold)) *
                        100
                    )
                  )
                : 100,
            campaignContributions:
              badge.campaignContributionThreshold > 0
                ? Math.min(
                    100,
                    Math.floor(
                      (Number(campaignContributionCount) /
                        Number(badge.campaignContributionThreshold)) *
                        100
                    )
                  )
                : 100,
          },
          isEarned: earnedBadgeSet.has(badgeIndex.toString()),
        };

        allBadges.push(badgeInfo);
        badgeIndex++;
      } catch (error) {
        // We've reached the end of the badges array
        break;
      }
    }

    // Split badges into earned and unearned
    const earnedBadgesInfo = allBadges.filter((badge) => badge.isEarned);
    let unearnedBadgesInfo = allBadges.filter((badge) => !badge.isEarned);

    // Sort unearned badges by progress (highest first)
    unearnedBadgesInfo = unearnedBadgesInfo.sort((a, b) => {
      const aMinProgress = Math.min(
        a.progress.score,
        a.progress.contributions,
        a.progress.payments,
        a.progress.campaignContributions
      );

      const bMinProgress = Math.min(
        b.progress.score,
        b.progress.contributions,
        b.progress.payments,
        b.progress.campaignContributions
      );

      return bMinProgress - aMinProgress; // Sort by descending progress
    });

    // Create the response data
    const badgeProgressionData: BadgeProgressionData = {
      address: userAddress,
      stats: {
        reputationScore: reputationScore.toString(),
        contributionCount: contributionCount.toString(),
        paymentCount: paymentCount.toString(),
        campaignContributionCount: campaignContributionCount.toString(),
        badgeCount: badgeCount.toString(),
      },
      earnedBadges: earnedBadgesInfo,
      unearnedBadges: unearnedBadgesInfo,
    };

    // Add next badge focus suggestion if there are unearned badges
    if (unearnedBadgesInfo.length > 0) {
      const nextBadge = unearnedBadgesInfo[0]; // Already sorted by progress
      badgeProgressionData.nextFocusBadge = nextBadge;

      // Suggest actions based on which requirement has lowest progress
      const lowestProgress = Math.min(
        Number(nextBadge.requirements.score) > 0
          ? nextBadge.progress.score
          : 100,
        Number(nextBadge.requirements.contributions) > 0
          ? nextBadge.progress.contributions
          : 100,
        Number(nextBadge.requirements.payments) > 0
          ? nextBadge.progress.payments
          : 100,
        Number(nextBadge.requirements.campaignContributions) > 0
          ? nextBadge.progress.campaignContributions
          : 100
      );

      const nextSteps: string[] = [];

      if (
        Number(nextBadge.requirements.score) > 0 &&
        nextBadge.progress.score === lowestProgress
      ) {
        const pointsNeeded =
          Number(nextBadge.requirements.score) - Number(reputationScore);
        nextSteps.push(`Earn ${pointsNeeded} more reputation points`);
      }

      if (
        Number(nextBadge.requirements.contributions) > 0 &&
        nextBadge.progress.contributions === lowestProgress
      ) {
        const contributionsNeeded =
          Number(nextBadge.requirements.contributions) -
          Number(contributionCount);
        nextSteps.push(`Make ${contributionsNeeded} more data contributions`);
      }

      if (
        Number(nextBadge.requirements.payments) > 0 &&
        nextBadge.progress.payments === lowestProgress
      ) {
        const paymentsNeeded =
          Number(nextBadge.requirements.payments) - Number(paymentCount);
        nextSteps.push(`Complete ${paymentsNeeded} more successful payments`);
      }

      if (
        Number(nextBadge.requirements.campaignContributions) > 0 &&
        nextBadge.progress.campaignContributions === lowestProgress
      ) {
        const campaignContributionsNeeded =
          Number(nextBadge.requirements.campaignContributions) -
          Number(campaignContributionCount);
        nextSteps.push(
          `Receive ${campaignContributionsNeeded} more contributions to your campaigns`
        );
      }

      badgeProgressionData.nextSteps = nextSteps;
    }

    return res.status(200).json({
      success: true,
      message: 'Badge progression data retrieved successfully',
      badgeProgression: badgeProgressionData,
    });
  } catch (error) {
    console.error('Error retrieving badge progression:', error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
      errorCode: 'SERVER_ERROR',
    });
  }
}
