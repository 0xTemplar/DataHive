import { createWalletClient, http, parseEther, createPublicClient } from 'viem';
import { baseSepolia } from 'viem/chains';
import ContributionManagerABI from '@/abi/ContributionManager.json';
import CampaignManagerABI from '@/abi/CampaignManager.json';
import { toast } from 'react-toastify';
import crypto from 'crypto';

// Contribution Manager contract address from environment variables
const contributionManagerAddress = process.env
  .NEXT_PUBLIC_CONTRIBUTION_MANAGER_ADDRESS as `0x${string}`;
const campaignManagerAddress = process.env
  .NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS as `0x${string}`;

interface SubmitContributionParams {
  campaignId: string; // String campaign ID
  dataUrl: string; // IPFS hash or any data reference
  rootCID: string; // Root CID from storage bucket upload
  score: number; // AI verification score
  contributorAddress: `0x${string}`; // Contributor's wallet address
  walletClient: any; // Viem wallet client
}

/**
 * Creates a numeric hash from a string
 * Note: This is for demonstration purposes and matches the contract's approach
 */
const calculateDataHash = (dataUrl: string): string => {
  return '0x' + crypto.createHash('sha256').update(dataUrl).digest('hex');
};

/**
 * Submits a contribution to the DataHive platform
 * @param params Contribution parameters
 * @returns The transaction hash
 */
export const submitContributionOnChain = async (
  params: SubmitContributionParams
) => {
  const {
    campaignId,
    dataUrl,
    rootCID,
    score,
    contributorAddress,
    walletClient,
  } = params;

  try {
    // 1. Create a public client for reading chain data
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    console.log('Submitting contribution to campaign:', campaignId);
    console.log('Data reference (rootCID):', rootCID);
    console.log('Score:', score);

    // 2. Get numeric campaign ID from string ID
    const numericCampaignId = await publicClient.readContract({
      address: campaignManagerAddress,
      abi: CampaignManagerABI,
      functionName: 'getCampaignIdFromString',
      args: [campaignId],
    });

    console.log('Numeric campaign ID:', numericCampaignId);

    // 3. Check if campaign is accepting submissions
    const isAccepting = await publicClient.readContract({
      address: campaignManagerAddress,
      abi: CampaignManagerABI,
      functionName: 'isAcceptingSubmissions',
      args: [numericCampaignId],
    });

    if (!isAccepting) {
      throw new Error('Campaign is not accepting submissions');
    }

    // 4. Calculate data hash
    const encryptedDataHash = rootCID; // Use rootCID directly as hash

    // 5. Get metadata URI - in this case, it can be the dataUrl or could be empty
    const metadataURI = dataUrl;

    // 6. Use an empty encrypted AES key since we're not encrypting anymore
    const encryptedAESKey = '';

    // 7. Write the contribution to the blockchain
    const tx = await walletClient.writeContract({
      address: contributionManagerAddress,
      abi: ContributionManagerABI,
      functionName: 'submitContribution',
      args: [
        numericCampaignId,
        encryptedDataHash,
        encryptedAESKey,
        metadataURI,
        score,
      ],
      account: contributorAddress,
      chain: baseSepolia,
    });

    console.log('Transaction hash:', tx);

    return {
      success: true,
      txHash: tx,
      contributionDetails: {
        campaignId: numericCampaignId,
        dataReference: rootCID,
        score: score,
      },
    };
  } catch (error: any) {
    console.error('Error submitting contribution:', error);

    if (error.message?.includes('user rejected transaction')) {
      toast.error('Transaction was rejected by the user');
      return { success: false, error: 'User rejected transaction' };
    }

    toast.error(`Failed to submit contribution: ${error.message}`);
    return { success: false, error: error.message };
  }
};

export default submitContributionOnChain;
