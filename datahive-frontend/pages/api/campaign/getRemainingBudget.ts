import { NextApiRequest, NextApiResponse } from 'next';
import { AptosClient, Types } from 'aptos';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { campaignId } = req.query;

  if (!campaignId || typeof campaignId !== 'string') {
    return res.status(400).json({ message: 'Campaign ID is required' });
  }

  try {
    console.log('Environment check:', {
      hasNodeUrl: !!process.env.NEXT_PUBLIC_NODE_URL,
      hasModuleAddress: !!process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS,
      nodeUrl: process.env.NEXT_PUBLIC_NODE_URL,
    });

    const client = new AptosClient(process.env.NEXT_PUBLIC_NODE_URL || '');
    const moduleAddress = process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS;

    if (!moduleAddress) {
      throw new Error('Module address not found in environment variables');
    }

    console.log('Processing campaign ID:', campaignId);

    const payload: Types.ViewRequest = {
      function: `${moduleAddress}::escrow::get_available_balance`,
      type_arguments: ['0x1::aptos_coin::AptosCoin'],
      arguments: [campaignId],
    };

    console.log('View request payload:', {
      function: payload.function,
      type_arguments: payload.type_arguments,
      arguments: payload.arguments,
    });

    const [remainingBudget] = await client.view(payload);

    if (remainingBudget) {
      const budgetOctas = remainingBudget.toString();
      return res.status(200).json({
        remainingBudgetOctas: budgetOctas,
        remainingBudgetApt: Number(budgetOctas) / 100000000,
      });
    }

    return res.status(404).json({ message: 'No budget information found' });
  } catch (error: any) {
    console.error('Detailed error:', {
      error,
      message: error.message,
      status: error.status,
      errorCode: error.errorCode,
      vmErrorCode: error.vmErrorCode,
    });

    return res.status(500).json({
      message: 'Error fetching campaign budget',
      details: {
        errorMessage: error.message,
        errorCode: error.errorCode,
        vmErrorCode: error.vmErrorCode,
      },
    });
  }
}
