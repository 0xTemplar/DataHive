import { NextApiRequest, NextApiResponse } from 'next';
import { AptosClient } from 'aptos';

interface Badge {
  badge_type: number;
  timestamp: string | number;
  description: number[];
}

interface ReputationStore {
  reputation_score: number;
  badges: Badge[];
  contribution_count: number;
  successful_payments: number;
}

interface BadgeProgress {
  name: string;
  threshold: number;
  progress: number;
  earned: boolean;
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

async function getReputationStore(
  client: AptosClient,
  moduleAddress: string,
  address: string
): Promise<ReputationStore | null> {
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

    return {
      reputation_score: Number(score[0]),
      badges: badges[0] as Badge[],
      contribution_count: Number(contributionCount[0]),
      successful_payments: Number(successfulPayments[0]),
    };
  } catch (error) {
    console.error('Error fetching reputation store:', error);
    return null;
  }
}

function calculateBadgeProgress(reputationScore: number): BadgeProgress[] {
  const thresholds = [
    { name: 'Bronze (Active Contributor)', threshold: 100 },
    { name: 'Silver (Reliable Participant)', threshold: 500 },
    { name: 'Gold (Top Contributor)', threshold: 1000 },
    { name: 'Platinum (Expert)', threshold: 5000 },
  ];

  return thresholds.map(({ name, threshold }) => ({
    name,
    threshold,
    progress: Math.min((reputationScore / threshold) * 100, 100),
    earned: reputationScore >= threshold,
  }));
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

    const reputationStore = await getReputationStore(
      client,
      moduleAddress,
      address
    );

    if (!reputationStore) {
      return res.status(404).json({
        message: 'No reputation store found for this address',
        reputation: {
          score: 0,
          badges: [],
          contribution_count: 0,
          successful_payments: 0,
          badge_progress: calculateBadgeProgress(0),
        },
      });
    }

    // Format badges with names and dates
    const formattedBadges = reputationStore.badges.map((badge) => ({
      ...badge,
      name: getBadgeTypeName(badge.badge_type),
      earned_at: new Date(Number(badge.timestamp) * 1000).toISOString(),
    }));

    // Calculate badge progress
    const badgeProgress = calculateBadgeProgress(
      reputationStore.reputation_score
    );

    return res.status(200).json({
      message: 'Reputation information retrieved successfully',
      reputation: {
        ...reputationStore,
        badges: formattedBadges,
        badge_progress: badgeProgress,
      },
    });
  } catch (error: any) {
    console.error('Error in getReputationInfo:', error);
    return res.status(500).json({
      message: 'Error fetching reputation information',
      error: error.message,
    });
  }
}
