import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import CampaignManagerABI from '../../../abi/CampaignManager.json';

interface ApiResponse {
  success: boolean;
  data?: {
    publicKey: string;
    campaignId: string | number;
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

    let numericCampaignId: number;

    // Determine if the campaignId is numeric or a string ID
    if (/^\d+$/.test(campaignIdInput)) {
      // If it's a numeric ID, use it directly
      numericCampaignId = parseInt(campaignIdInput);
    } else {
      // If it's a string ID, we need to convert it to a numeric ID
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

        numericCampaignId = Number(
          await campaignManager.getCampaignIdFromString(campaignIdInput)
        );
      } catch (error) {
        console.error('Error converting campaign string ID:', error);
        return res.status(400).json({
          success: false,
          error: 'Invalid campaign ID format',
          errorCode: 'INVALID_CAMPAIGN_ID',
        });
      }
    }

    // Get the encryption public key for the campaign
    try {
      const publicKey = await campaignManager.getCampaignEncryptionPublicKey(
        numericCampaignId
      );

      return res.status(200).json({
        success: true,
        data: {
          publicKey: publicKey,
          campaignId: campaignIdInput,
        },
      });
    } catch (error: any) {
      console.error('Error retrieving campaign public key:', error);

      if (error.message && error.message.includes('execution reverted')) {
        return res.status(404).json({
          success: false,
          error: 'The campaign does not exist or is not accessible',
          errorCode: 'CONTRACT_ERROR',
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('Error retrieving campaign public key:', error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
      errorCode: 'SERVER_ERROR',
    });
  }
}
