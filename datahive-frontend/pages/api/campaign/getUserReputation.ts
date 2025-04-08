import { NextApiRequest, NextApiResponse } from 'next';
import { AptosClient } from 'aptos';

interface UserReputation {
  reputation_score: number;
  contribution_count: number;
  successful_payments: number;
  has_store: boolean;
}

async function getUserReputation(
  client: AptosClient,
  moduleAddress: string,
  address: string
): Promise<UserReputation> {
  try {
    const hasStore = await client.view({
      function: `${moduleAddress}::reputation::has_reputation_store`,
      type_arguments: [],
      arguments: [address],
    });

    if (!hasStore[0]) {
      return {
        reputation_score: 0,
        contribution_count: 0,
        successful_payments: 0,
        has_store: false,
      };
    }

    const [score] = await client.view({
      function: `${moduleAddress}::reputation::get_reputation_score`,
      type_arguments: [],
      arguments: [address],
    });

    const [contributionCount] = await client.view({
      function: `${moduleAddress}::reputation::get_contribution_count`,
      type_arguments: [],
      arguments: [address],
    });

    // Get successful payments
    const [successfulPayments] = await client.view({
      function: `${moduleAddress}::reputation::get_successful_payments`,
      type_arguments: [],
      arguments: [address],
    });

    return {
      reputation_score: Number(score),
      contribution_count: Number(contributionCount),
      successful_payments: Number(successfulPayments),
      has_store: true,
    };
  } catch (error) {
    console.error('Error fetching user reputation:', error);
    return {
      reputation_score: 0,
      contribution_count: 0,
      successful_payments: 0,
      has_store: false,
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

    const reputation = await getUserReputation(client, moduleAddress, address);

    return res.status(200).json({
      message: 'User reputation retrieved successfully',
      reputation,
    });
  } catch (error: any) {
    console.error('Error in getUserReputation:', error);
    return res.status(500).json({
      message: 'Error fetching user reputation',
      error: error.message,
    });
  }
}
