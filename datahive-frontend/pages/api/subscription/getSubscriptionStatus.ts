import { NextApiRequest, NextApiResponse } from 'next';
import { AptosClient } from 'aptos';

interface SubscriptionStatus {
  isActive: boolean;
  endTime: string | null; // ISO date string
  subscriptionType: string | null;
  autoRenew: boolean;
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

    try {
      const result = await client.view({
        function: `${moduleAddress}::subscription::get_subscription_status`,
        type_arguments: [],
        arguments: [address],
      });

      const subscriptionStatus: SubscriptionStatus = {
        isActive: result[0] === true || result[0] === 'true',
        endTime: result[1]
          ? new Date(Number(result[1]) * 1000).toISOString()
          : null,
        subscriptionType:
          typeof result[2] === 'string'
            ? result[2]
            : result[2] && typeof result[2] === 'object' && 'value' in result[2]
            ? String(result[2].value)
            : null,
        autoRenew: result[3] === true || result[3] === 'true',
      };

      return res.status(200).json({
        message: 'Subscription status retrieved successfully',
        status: subscriptionStatus,
      });
    } catch (error) {
      // If the view function fails, it likely means no subscription exists
      return res.status(200).json({
        message: 'No active subscription found',
        status: {
          isActive: false,
          endTime: null,
          subscriptionType: null,
          autoRenew: false,
        },
      });
    }
  } catch (error: any) {
    console.error('Error in getSubscriptionStatus:', error);
    return res.status(500).json({
      message: 'Error fetching subscription status',
      error: error.message,
    });
  }
}
