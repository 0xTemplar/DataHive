import { NextApiRequest, NextApiResponse } from 'next';
import { AptosClient } from 'aptos';

interface Badge {
  badge_type: number;
  timestamp: string | number;
  description: number[];
}

interface BadgeInfo {
  type: number;
  name: string;
  earnedDate: string;
}

interface ProgressInfo {
  badge: string;
  threshold: number;
  progress: number;
  progressPercentage: number;
}

interface ReputationInfo {
  reputationScore: number;
  badges: BadgeInfo[];
  badgeProgress: ProgressInfo[];
  contributionCount: number;
  successfulPayments: number;
}

function getBadgeTypeName(badge_type: number): string {
  switch (badge_type) {
    // Contributor badges
    case 1:
      return 'Active Contributor';
    case 2:
      return 'Top Contributor';
    case 3:
      return 'Expert Contributor';

    // Campaign creator badges
    case 10:
      return 'Campaign Creator';
    case 11:
      return 'Reliable Payer';
    case 12:
      return 'Trusted Creator';
    case 13:
      return 'Expert Creator';

    // Verifier badges
    case 20:
      return 'Verifier';
    case 21:
      return 'Trusted Verifier';
    case 22:
      return 'Expert Verifier';

    // Achievement badges
    case 30:
      return 'First Contribution';
    case 31:
      return 'First Campaign';
    case 32:
      return 'First Verification';

    default:
      return 'Unknown Badge';
  }
}

async function getUserReputationInfo(
  client: AptosClient,
  moduleAddress: string,
  address: string
): Promise<ReputationInfo | null> {
  try {
    // Check if reputation store exists
    const hasStore = await client.view({
      function: `${moduleAddress}::reputation::has_reputation_store`,
      type_arguments: [],
      arguments: [address],
    });

    if (!hasStore[0]) {
      return null;
    }

    // Get reputation score
    const score = await client.view({
      function: `${moduleAddress}::reputation::get_reputation_score`,
      type_arguments: [],
      arguments: [address],
    });

    // Get badges
    const badges = await client.view({
      function: `${moduleAddress}::reputation::get_badges`,
      type_arguments: [],
      arguments: [address],
    });

    // Get contribution count
    const contributionCount = await client.view({
      function: `${moduleAddress}::reputation::get_contribution_count`,
      type_arguments: [],
      arguments: [address],
    });

    // Get successful payments
    const successfulPayments = await client.view({
      function: `${moduleAddress}::reputation::get_successful_payments`,
      type_arguments: [],
      arguments: [address],
    });

    const reputationScore = Number(score[0]);
    const badgesList = badges[0] as Badge[];

    // Format badges
    const formattedBadges: BadgeInfo[] = badgesList.map((badge) => ({
      type: badge.badge_type,
      name: getBadgeTypeName(badge.badge_type),
      earnedDate: new Date(Number(badge.timestamp) * 1000).toISOString(),
    }));

    // Calculate badge progress
    const thresholds = {
      'Bronze (Active Contributor)': 100,
      'Silver (Reliable Participant)': 500,
      'Gold (Top Contributor)': 1000,
      'Platinum (Expert)': 5000,
    };

    const badgeProgress: ProgressInfo[] = Object.entries(thresholds).map(
      ([badge, threshold]) => {
        const progressPercentage = Math.min(
          (reputationScore / threshold) * 100,
          100
        );
        return {
          badge,
          threshold,
          progress: reputationScore,
          progressPercentage,
        };
      }
    );

    return {
      reputationScore,
      badges: formattedBadges,
      badgeProgress,
      contributionCount: Number(contributionCount[0]),
      successfulPayments: Number(successfulPayments[0]),
    };
  } catch (error) {
    console.error('Error fetching reputation information:', error);
    // Return default empty reputation info instead of throwing error
    const thresholds = {
      'Bronze (Active Contributor)': 100,
      'Silver (Reliable Participant)': 500,
      'Gold (Top Contributor)': 1000,
      'Platinum (Expert)': 5000,
    };

    const badgeProgress: ProgressInfo[] = Object.entries(thresholds).map(
      ([badge, threshold]) => ({
        badge,
        threshold,
        progress: 0,
        progressPercentage: 0,
      })
    );

    return {
      reputationScore: 0,
      badges: [],
      badgeProgress,
      contributionCount: 0,
      successfulPayments: 0,
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ message: 'Address is required' });
  }

  try {
    const client = new AptosClient(process.env.NEXT_PUBLIC_NODE_URL || '');
    const moduleAddress = process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS;

    if (!moduleAddress) {
      throw new Error('Module address not found in environment variables');
    }

    const reputationInfo = await getUserReputationInfo(
      client,
      moduleAddress,
      address
    );

    if (!reputationInfo) {
      return res.status(200).json({
        message: 'No reputation store found for this address',
        reputationInfo: {
          reputationScore: 0,
          badges: [],
          badgeProgress: Object.entries({
            'Bronze (Active Contributor)': 100,
            'Silver (Reliable Participant)': 500,
            'Gold (Top Contributor)': 1000,
            'Platinum (Expert)': 5000,
          }).map(([badge, threshold]) => ({
            badge,
            threshold,
            progress: 0,
            progressPercentage: 0,
          })),
          contributionCount: 0,
          successfulPayments: 0,
        },
      });
    }

    return res.status(200).json({
      message: 'User reputation information retrieved successfully',
      reputationInfo,
    });
  } catch (error: any) {
    console.error('Error in getUserBadges:', error);
    // Return a 200 response with default data instead of a 500 error
    return res.status(200).json({
      message: 'No reputation data found for this address',
      reputationInfo: {
        reputationScore: 0,
        badges: [],
        badgeProgress: Object.entries({
          'Bronze (Active Contributor)': 100,
          'Silver (Reliable Participant)': 500,
          'Gold (Top Contributor)': 1000,
          'Platinum (Expert)': 5000,
        }).map(([badge, threshold]) => ({
          badge,
          threshold,
          progress: 0,
          progressPercentage: 0,
        })),
        contributionCount: 0,
        successfulPayments: 0,
      },
    });
  }
}
