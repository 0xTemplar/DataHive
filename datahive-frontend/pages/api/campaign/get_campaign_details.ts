import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import CampaignManagerABI from '../../../abi/CampaignManager.json';

interface Campaign {
  id: bigint;
  campaignIdString: string;
  creator: string;
  title: string;
  description: string;
  dataRequirements: string;
  qualityCriteria: string[];
  unitPrice: bigint;
  totalBudget: bigint;
  remainingBudget: bigint;
  maxSubmissions: bigint;
  currentSubmissions: bigint;
  startTime: bigint;
  expiration: bigint;
  active: boolean;
  platformFee: bigint;
  rewardThreshold: bigint;
}

interface CampaignDetails {
  id: string;
  campaignIdString: string;
  creator: string;
  title: string;
  description: string;
  dataRequirements: string;
  qualityCriteria: string[];
  unitPrice: string;
  totalBudget: string;
  remainingBudget: string;
  maxSubmissions: string;
  currentSubmissions: string;
  startTime: string;
  expiration: string;
  active: boolean;
  platformFee: string;
  rewardThreshold: string;
}

interface CampaignStatus {
  active: boolean;
  totalContributions: string;
  remainingSlots: string;
  acceptingSubmissions: boolean;
}

interface ApiResponse {
  success: boolean;
  data?: {
    details: CampaignDetails;
    status: CampaignStatus;
  };
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

    const campaignIdInput = Array.isArray(campaignId)
      ? campaignId[0]
      : campaignId;

    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'
    );

    let campaignManagerAddress;

    try {
      campaignManagerAddress = process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS;

      if (!campaignManagerAddress) {
        throw new Error('CampaignManager address not found');
      }
    } catch (error) {
      console.error('Error loading campaign manager address:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to load contract address configuration',
      });
    }

    const campaignManager = new ethers.Contract(
      campaignManagerAddress,
      CampaignManagerABI,
      provider
    );

    if (!/^\d+$/.test(campaignIdInput)) {
      try {
        const exists = await campaignManager.campaignIdStringExists(
          campaignIdInput
        );
        if (!exists) {
          return res.status(404).json({
            success: false,
            error: `Campaign with ID "${campaignIdInput}" does not exist on the blockchain`,
            errorCode: 'CAMPAIGN_NOT_FOUND',
          });
        }
      } catch (error) {
        console.error('Error checking if campaign exists:', error);
      }
    }

    let campaign: Campaign;

    try {
      // Determine if the campaignId is numeric or a string ID
      if (/^\d+$/.test(campaignIdInput)) {
        // If it's a numeric ID, use getCampaignDetails
        const numericId = parseInt(campaignIdInput);
        campaign = await campaignManager.getCampaignDetails(numericId);
      } else {
        // If it's a string ID, use getCampaignDetailsByString
        campaign = await campaignManager.getCampaignDetailsByString(
          campaignIdInput
        );
      }
    } catch (error: any) {
      console.error('Error retrieving campaign details:', error);

      if (
        error.message &&
        error.message.includes('Campaign ID string does not exist')
      ) {
        return res.status(404).json({
          success: false,
          error: `Campaign with ID "${campaignIdInput}" does not exist on the blockchain`,
          errorCode: 'CAMPAIGN_NOT_FOUND',
        });
      }

      if (error.message && error.message.includes('execution reverted')) {
        return res.status(404).json({
          success: false,
          error: 'The campaign does not exist or is not accessible',
          errorCode: 'CONTRACT_ERROR',
        });
      }

      throw error;
    }

    const details: CampaignDetails = {
      id: campaign.id.toString(),
      campaignIdString: campaign.campaignIdString,
      creator: campaign.creator,
      title: campaign.title,
      description: campaign.description,
      dataRequirements: campaign.dataRequirements,
      qualityCriteria: campaign.qualityCriteria,
      unitPrice: ethers.formatEther(campaign.unitPrice),
      totalBudget: ethers.formatEther(campaign.totalBudget),
      remainingBudget: ethers.formatEther(campaign.remainingBudget),
      maxSubmissions: campaign.maxSubmissions.toString(),
      currentSubmissions: campaign.currentSubmissions.toString(),
      startTime: new Date(Number(campaign.startTime) * 1000).toLocaleString(),
      expiration: new Date(Number(campaign.expiration) * 1000).toLocaleString(),
      active: campaign.active,
      platformFee: `${Number(campaign.platformFee) / 100}%`,
      rewardThreshold: `${campaign.rewardThreshold}%`,
    };

    const numericCampaignId = /^\d+$/.test(campaignIdInput)
      ? parseInt(campaignIdInput)
      : Number(campaign.id);

    const status = await campaignManager.getCampaignStatus(numericCampaignId);
    const isAccepting = await campaignManager.isAcceptingSubmissions(
      numericCampaignId
    );

    const campaignStatus: CampaignStatus = {
      active: status[0],
      totalContributions: status[1].toString(),
      remainingSlots: status[2].toString(),
      acceptingSubmissions: isAccepting,
    };

    return res.status(200).json({
      success: true,
      data: {
        details,
        status: campaignStatus,
      },
    });
  } catch (error) {
    console.error('Error retrieving campaign details:', error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
      errorCode: 'SERVER_ERROR',
    });
  }
}
