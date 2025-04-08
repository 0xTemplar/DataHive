import { NextApiRequest, NextApiResponse } from 'next';
import { AptosClient, Types } from 'aptos';

interface Contribution {
  contribution_id: string;
  campaign_id: string;
  contributor: string;
  data_url: string;
  data_hash: string;
  timestamp: string;
  verification_scores: {
    verifier_reputation: number;
    quality_score: number;
  };
  is_verified: boolean;
  reward_released: boolean;
  contributor_reputation?: number;
}

interface CampaignDetails {
  title: string;
  description: string;
  requirements: string;
  criteria: string;
  unitPrice: number;
  totalBudget: number;
  minDataCount: number;
  maxDataCount: number;
  expiration: number;
  isActive: boolean;
  metadataUri: string;
}

interface EscrowInfo {
  owner: string;
  totalLocked: number;
  totalReleased: number;
  unitReward: number;
  platformFee: number;
  isActive: boolean;
}

async function getCampaignDetails(
  client: AptosClient,
  moduleAddress: string,
  campaignId: string
): Promise<CampaignDetails | null> {
  try {
    const details = await client.view({
      function: `${moduleAddress}::campaign::get_campaign_details`,
      type_arguments: [],
      arguments: [moduleAddress, campaignId],
    });

    return {
      title: String(details[0]),
      description: String(details[1]),
      requirements: String(details[2]),
      criteria: String(details[3]),
      unitPrice: Number(details[4]),
      totalBudget: Number(details[5]),
      minDataCount: Number(details[6]),
      maxDataCount: Number(details[7]),
      expiration: Number(details[8]),
      isActive: Boolean(details[9]),
      metadataUri: String(details[10]),
    };
  } catch (error) {
    console.error('Error fetching campaign details:', error);
    return null;
  }
}

async function getEscrowInfo(
  client: AptosClient,
  moduleAddress: string,
  campaignId: string
): Promise<EscrowInfo | null> {
  try {
    const escrowInfo = await client.view({
      function: `${moduleAddress}::escrow::get_escrow_info`,
      type_arguments: ['0x1::aptos_coin::AptosCoin'],
      arguments: [campaignId],
    });

    return {
      owner: String(escrowInfo[0]),
      totalLocked: Number(escrowInfo[1]),
      totalReleased: Number(escrowInfo[2]),
      unitReward: Number(escrowInfo[3]),
      platformFee: Number(escrowInfo[4]),
      isActive: Boolean(escrowInfo[5]),
    };
  } catch (error) {
    console.error('Error fetching escrow info:', error);
    return null;
  }
}

async function getContributions(
  client: AptosClient,
  moduleAddress: string,
  campaignId?: string,
  contributorAddress?: string
): Promise<Contribution[]> {
  try {
    const contributionStore = await client.view({
      function: `${moduleAddress}::contribution::get_contribution_store`,
      type_arguments: [],
      arguments: [],
    });

    let contributions = contributionStore[0] as Contribution[];

    if (campaignId) {
      contributions = contributions.filter((c) => c.campaign_id === campaignId);
    }

    if (contributorAddress) {
      contributions = contributions.filter(
        (c) => c.contributor === contributorAddress
      );
    }

    return contributions;
  } catch (error) {
    console.error('Error fetching contributions:', error);
    return [];
  }
}

async function getAddressReputation(
  client: AptosClient,
  moduleAddress: string,
  address: string
): Promise<number> {
  try {
    const hasStore = await client.view({
      function: `${moduleAddress}::reputation::has_reputation_store`,
      type_arguments: [],
      arguments: [address],
    });

    if (!hasStore[0]) {
      return 0;
    }

    const reputation = await client.view({
      function: `${moduleAddress}::reputation::get_reputation_score`,
      type_arguments: [],
      arguments: [address],
    });
    return Number(reputation[0]);
  } catch (error) {
    console.error('Error fetching reputation:', error);
    return 0;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { campaignId, contributorAddress } = req.query;

  if (!campaignId && !contributorAddress) {
    return res.status(400).json({
      message: 'Please provide either a campaign ID or contributor address',
    });
  }

  try {
    const client = new AptosClient(process.env.NEXT_PUBLIC_NODE_URL || '');
    const moduleAddress = process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS;

    if (!moduleAddress) {
      throw new Error('Module address not found in environment variables');
    }

    // Get contributions
    const contributions = await getContributions(
      client,
      moduleAddress,
      campaignId as string,
      contributorAddress as string
    );

    // Fetch reputation scores for all contributors
    const contributorsWithReputation = await Promise.all(
      contributions.map(async (contribution) => ({
        ...contribution,
        contributor_reputation: await getAddressReputation(
          client,
          moduleAddress,
          contribution.contributor
        ),
      }))
    );

    // Get additional information if we have contributions
    let additionalInfo = null;
    if (contributions.length > 0 && campaignId && !contributorAddress) {
      const [campaignDetails, escrowInfo] = await Promise.all([
        getCampaignDetails(client, moduleAddress, campaignId as string),
        getEscrowInfo(client, moduleAddress, campaignId as string),
      ]);

      additionalInfo = {
        campaignDetails,
        escrowInfo,
      };
    }

    // Calculate statistics
    const verifiedCount = contributions.filter((c) => c.is_verified).length;
    const rewardedCount = contributions.filter((c) => c.reward_released).length;
    const verificationRate =
      contributions.length > 0
        ? (verifiedCount / contributions.length) * 100
        : 0;
    const rewardRate =
      contributions.length > 0
        ? (rewardedCount / contributions.length) * 100
        : 0;

    const statistics = {
      totalContributions: contributions.length,
      verifiedContributions: verifiedCount,
      rewardsReleased: rewardedCount,
      verificationRate,
      rewardRate,
    };

    // Format the response
    return res.status(200).json({
      contributions: contributorsWithReputation.map((c) => ({
        ...c,
        data_hash: Buffer.from(c.data_hash).toString('hex'),
        timestamp: new Date(Number(c.timestamp) * 1000).toISOString(),
      })),
      statistics,
      additionalInfo,
    });
  } catch (error: any) {
    console.error('Error in getCampaignContributions:', error);
    return res.status(500).json({
      message: 'Error fetching campaign contributions',
      error: error.message,
    });
  }
}
