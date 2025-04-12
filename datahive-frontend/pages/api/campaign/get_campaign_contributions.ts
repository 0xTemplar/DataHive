import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import CampaignManagerABI from '../../../abi/CampaignManager.json';
import ContributionManagerABI from '../../../abi/ContributionManager.json';

interface Contribution {
  id: string;
  contributor: string;
  encryptedDataHash: string;
  metadataURI: string;
  score: number;
  qualified: boolean;
  timestamp: string;
  formattedTime: string;
}

interface Campaign {
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
}

interface ContributionStats {
  totalContributions: number;
  qualifiedCount: number;
  qualifiedPercentage: string;
  averageScore: string;
  thresholdScore: string;
  uniqueContributors: number;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  campaign?: Campaign;
  contributions?: Contribution[];
  stats?: ContributionStats;
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
    const { campaignId } = req.query;

    if (!campaignId) {
      return res
        .status(400)
        .json({ success: false, error: 'Campaign ID is required' });
    }

    const campaignIdString = Array.isArray(campaignId)
      ? campaignId[0]
      : campaignId;

    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'
    );

    const contributionManagerAddress =
      process.env.NEXT_PUBLIC_CONTRIBUTION_MANAGER_ADDRESS;
    const campaignManagerAddress =
      process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS;

    if (!contributionManagerAddress || !campaignManagerAddress) {
      return res.status(500).json({
        success: false,
        error: 'Contract addresses not found in environment variables',
        errorCode: 'CONFIG_ERROR',
      });
    }

    const contributionManager = new ethers.Contract(
      contributionManagerAddress,
      ContributionManagerABI,
      provider
    );

    const campaignManager = new ethers.Contract(
      campaignManagerAddress,
      CampaignManagerABI,
      provider
    );

    let numericCampaignId;

    try {
      numericCampaignId = await campaignManager.campaignIdStringToId(
        campaignIdString
      );
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: `Campaign with ID string "${campaignIdString}" not found`,
        errorCode: 'CAMPAIGN_NOT_FOUND',
      });
    }

    const campaignData = await campaignManager.getCampaignDetails(
      numericCampaignId
    );

    const campaign: Campaign = {
      id: campaignData.id.toString(),
      campaignIdString: campaignData.campaignIdString,
      title: campaignData.title,
      creator: campaignData.creator,
      description: campaignData.description,
      unitPrice: ethers.formatEther(campaignData.unitPrice),
      currentSubmissions: campaignData.currentSubmissions.toString(),
      maxSubmissions: campaignData.maxSubmissions.toString(),
      remainingBudget: ethers.formatEther(campaignData.remainingBudget),
      totalBudget: ethers.formatEther(campaignData.totalBudget),
      rewardThreshold: campaignData.rewardThreshold.toString(),
      active: campaignData.active,
    };

    // Get all contributions for this campaign
    const contributionIds = await contributionManager.getCampaignSubmissions(
      numericCampaignId
    );

    if (contributionIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No contributions found for this campaign',
        campaign,
        contributions: [],
        stats: {
          totalContributions: 0,
          qualifiedCount: 0,
          qualifiedPercentage: '0.00',
          averageScore: '0',
          thresholdScore: campaign.rewardThreshold,
          uniqueContributors: 0,
        },
      });
    }

    // Create summary counters
    let qualifiedCount = 0;
    let totalScore = 0;
    const uniqueContributors = new Set<string>();
    const contributions: Contribution[] = [];

    // Get details for each contribution
    for (let i = 0; i < contributionIds.length; i++) {
      const contributionId = contributionIds[i];
      const contributionData = await contributionManager.getContributionDetails(
        contributionId
      );

      // Format timestamp
      const timestamp = new Date(Number(contributionData.timestamp) * 1000);

      // Update counters
      totalScore += Number(contributionData.score);
      if (contributionData.qualified) {
        qualifiedCount++;
      }
      uniqueContributors.add(contributionData.contributor);

      contributions.push({
        id: contributionData.id.toString(),
        contributor: contributionData.contributor,
        encryptedDataHash: contributionData.encryptedDataHash,
        metadataURI: contributionData.metadataURI,
        score: Number(contributionData.score),
        qualified: contributionData.qualified,
        timestamp: contributionData.timestamp.toString(),
        formattedTime: timestamp.toLocaleString(),
      });
    }

    // Calculate statistics
    const avgScore =
      contributionIds.length > 0 ? totalScore / contributionIds.length : 0;
    const qualifiedPercentage =
      contributionIds.length > 0
        ? (qualifiedCount / contributionIds.length) * 100
        : 0;

    const stats: ContributionStats = {
      totalContributions: contributionIds.length,
      qualifiedCount,
      qualifiedPercentage: qualifiedPercentage.toFixed(2),
      averageScore: avgScore.toFixed(2),
      thresholdScore: campaign.rewardThreshold,
      uniqueContributors: uniqueContributors.size,
    };

    return res.status(200).json({
      success: true,
      message: 'Campaign contributions retrieved successfully',
      campaign,
      contributions,
      stats,
    });
  } catch (error) {
    console.error('Error retrieving campaign contributions:', error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
      errorCode: 'SERVER_ERROR',
    });
  }
}
