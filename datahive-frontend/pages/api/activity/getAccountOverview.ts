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
    const campaignCounts = await client.view({
      function: `${moduleAddress}::campaign::get_address_campaign_count`,
      type_arguments: [],
      arguments: [moduleAddress, address],
    });

    const contributionCounts = await client.view({
      function: `${moduleAddress}::contribution::get_address_total_contributions`,
      type_arguments: [],
      arguments: [address],
    });

    const totalCampaigns = Number(campaignCounts[0]);
    const activeCampaigns = Number(campaignCounts[1]);
    const totalContributions = Number(contributionCounts[0]);
    const verifiedContributions = Number(contributionCounts[1]);

    return {
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        inactive: totalCampaigns - activeCampaigns,
        activeRate:
          totalCampaigns > 0 ? (activeCampaigns / totalCampaigns) * 100 : 0,
      },
      contributions: {
        total: totalContributions,
        verified: verifiedContributions,
        pending: totalContributions - verifiedContributions,
        successRate:
          totalContributions > 0
            ? (verifiedContributions / totalContributions) * 100
            : 0,
      },
    };
  } catch (error) {
    console.error('Error fetching activity statistics:', error);
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
      message: 'Account overview retrieved successfully',
      stats,
      summary: {
        isActive: stats.campaigns.active > 0 || stats.contributions.total > 0,
        lastActive: new Date().toISOString(),
        primaryRole:
          stats.campaigns.total > stats.contributions.total
            ? 'Campaign Creator'
            : 'Contributor',
        activityLevel: calculateActivityLevel(stats),
      },
    });
  } catch (error: any) {
    console.error('Error in getAccountOverview:', error);
    return res.status(500).json({
      message: 'Error fetching account overview',
      error: error.message,
    });
  }
}

function calculateActivityLevel(
  stats: ActivityStats
): 'High' | 'Medium' | 'Low' | 'Inactive' {
  const totalActivity = stats.campaigns.total + stats.contributions.total;
  const successRate =
    (stats.campaigns.activeRate + stats.contributions.successRate) / 2;

  if (totalActivity === 0) return 'Inactive';
  if (totalActivity > 10 && successRate > 70) return 'High';
  if (totalActivity > 5 && successRate > 50) return 'Medium';
  return 'Low';
}
