import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import CampaignManagerABI from '../../../abi/CampaignManager.json';
import ContributionManagerABI from '../../../abi/ContributionManager.json';
import ReputationABI from '../../../abi/Reputation.json';

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

interface ApiResponse {
  success: boolean;
  message?: string;
  summary?: SummaryData;
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

    // Load contract addresses from environment variables
    const campaignManagerAddress =
      process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS;
    const contributionManagerAddress =
      process.env.NEXT_PUBLIC_CONTRIBUTION_MANAGER_ADDRESS;
    const reputationAddress = process.env.NEXT_PUBLIC_REPUTATION_ADDRESS;

    if (
      !campaignManagerAddress ||
      !contributionManagerAddress ||
      !reputationAddress
    ) {
      return res.status(500).json({
        success: false,
        error: 'Contract addresses not properly configured',
        errorCode: 'CONTRACT_CONFIG_ERROR',
      });
    }

    // Initialize contracts
    const campaignManager = new ethers.Contract(
      campaignManagerAddress,
      CampaignManagerABI,
      provider
    );

    const contributionManager = new ethers.Contract(
      contributionManagerAddress,
      ContributionManagerABI,
      provider
    );

    const reputation = new ethers.Contract(
      reputationAddress,
      ReputationABI,
      provider
    );

    // Fetch campaign and contribution data
    const [totalSpent, totalEarned, campaignCounts, contributionCounts] =
      await Promise.all([
        campaignManager.getAddressTotalSpent(userAddress),
        campaignManager.getAddressTotalEarned(userAddress),
        campaignManager.getAddressCampaignCount(userAddress),
        contributionManager.getAddressTotalContributions(userAddress),
      ]);

    // Check reputation and fetch reputation data if available
    const hasReputationStore = await reputation.hasReputationStore(userAddress);

    let reputationScore = '0';
    let badgeCount = '0';

    if (hasReputationStore) {
      const [score, badges] = await Promise.all([
        reputation.getReputationScore(userAddress),
        reputation.getBadgeCount(userAddress),
      ]);

      reputationScore = score.toString();
      badgeCount = badges.toString();
    }

    // Format the summary data
    const summaryData: SummaryData = {
      address: userAddress,
      financial: {
        totalSpent: totalSpent.toString(),
        totalEarned: totalEarned.toString(),
      },
      campaigns: {
        total: campaignCounts[0].toString(),
        active: campaignCounts[1].toString(),
      },
      contributions: {
        totalSubmitted: contributionCounts[0].toString(),
        totalQualified: contributionCounts[1].toString(),
      },
      reputation: {
        reputationScore,
        badgeCount,
        hasReputation: hasReputationStore,
      },
    };

    return res.status(200).json({
      success: true,
      message: 'User summary data retrieved successfully',
      summary: summaryData,
    });
  } catch (error) {
    console.error('Error retrieving user summary data:', error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
      errorCode: 'SERVER_ERROR',
    });
  }
}
