import { NextApiRequest, NextApiResponse } from 'next';
import { AptosClient } from 'aptos';

interface FinancialStats {
  totalSpent: number;
  totalEarned: number;
  netPosition: number;
}

async function getFinancialStats(
  client: AptosClient,
  moduleAddress: string,
  address: string
): Promise<FinancialStats> {
  try {
    // Get total spent on campaigns
    const totalSpent = await client.view({
      function: `${moduleAddress}::campaign::get_address_total_spent`,
      type_arguments: ['0x1::aptos_coin::AptosCoin'],
      arguments: [moduleAddress, address],
    });

    // Get total earned from contributions
    const totalEarned = await client.view({
      function: `${moduleAddress}::campaign::get_address_total_earned`,
      type_arguments: ['0x1::aptos_coin::AptosCoin'],
      arguments: [moduleAddress, address],
    });

    const spentAmount = Number(totalSpent[0]);
    const earnedAmount = Number(totalEarned[0]);
    const netPosition = earnedAmount - spentAmount;

    return {
      totalSpent: spentAmount,
      totalEarned: earnedAmount,
      netPosition: netPosition,
    };
  } catch (error) {
    console.error('Error fetching financial statistics:', error);
    // Return default values instead of throwing error
    return {
      totalSpent: 0,
      totalEarned: 0,
      netPosition: 0,
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

    const stats = await getFinancialStats(client, moduleAddress, address);

    return res.status(200).json({
      message: 'User financial statistics retrieved successfully',
      stats,
    });
  } catch (error: any) {
    console.error('Error in getUserStats:', error);
    // Return a 200 response with empty data instead of a 500 error
    return res.status(200).json({
      message: 'No financial data found for this address',
      stats: {
        totalSpent: 0,
        totalEarned: 0,
        netPosition: 0,
      },
    });
  }
}
