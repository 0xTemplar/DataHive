import { NextApiRequest, NextApiResponse } from 'next';
import { AptosClient } from 'aptos';

interface ActivityStats {
  campaigns: {
    total: number;
    active: number;
    inactive: number;
    activeRate: number;
  };
  contributions: {
    total: number;
    verified: number;
    pending: number;
    successRate: number;
  };
}

async function getActivityStats(
  client: AptosClient,
  moduleAddress: string,
  address: string
): Promise<ActivityStats> {
  try {
    // Get campaign counts
    const campaignCounts = await client.view({
      function: `${moduleAddress}::campaign::get_address_campaign_count`,
      type_arguments: [],
      arguments: [moduleAddress, address],
    });

    // Get contribution counts
    const contributionCounts = await client.view({
      function: `${moduleAddress}::contribution::get_address_total_contributions`,
      type_arguments: [],
      arguments: [address],
    });

    const totalCampaigns = Number(campaignCounts[0]);
    const activeCampaigns = Number(campaignCounts[1]);
    const inactiveCampaigns = totalCampaigns - activeCampaigns;
    const activeRate =
      totalCampaigns > 0 ? (activeCampaigns / totalCampaigns) * 100 : 0;

    const totalContributions = Number(contributionCounts[0]);
    const verifiedContributions = Number(contributionCounts[1]);
    const pendingContributions = totalContributions - verifiedContributions;
    const successRate =
      totalContributions > 0
        ? (verifiedContributions / totalContributions) * 100
        : 0;

    return {
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        inactive: inactiveCampaigns,
        activeRate: activeRate,
      },
      contributions: {
        total: totalContributions,
        verified: verifiedContributions,
        pending: pendingContributions,
        successRate: successRate,
      },
    };
  } catch (error) {
    console.error('Error fetching activity statistics:', error);
    // Return default values instead of throwing error
    return {
      campaigns: {
        total: 0,
        active: 0,
        inactive: 0,
        activeRate: 0,
      },
      contributions: {
        total: 0,
        verified: 0,
        pending: 0,
        successRate: 0,
      },
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

    const stats = await getActivityStats(client, moduleAddress, address);

    return res.status(200).json({
      message: 'User activity statistics retrieved successfully',
      stats,
    });
  } catch (error: any) {
    console.error('Error in getUserActivity:', error);
    // Return a 200 response with empty data instead of a 500 error
    return res.status(200).json({
      message: 'No activity data found for this address',
      stats: {
        campaigns: {
          total: 0,
          active: 0,
          inactive: 0,
          activeRate: 0,
        },
        contributions: {
          total: 0,
          verified: 0,
          pending: 0,
          successRate: 0,
        },
      },
    });
  }
}
