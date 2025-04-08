import { NextApiRequest, NextApiResponse } from 'next';
import { AptosClient, HexString, Types } from 'aptos';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { campaignId, campaignAddress } = req.query;

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

    console.log('Fetching public key for:', {
      campaignId,
      campaignAddress: campaignAddress || moduleAddress,
    });

    // Get campaign public key using view function
    const result = await client.view({
      function: `${moduleAddress}::campaign::get_encryption_public_key`,
      type_arguments: [],
      arguments: [campaignAddress || moduleAddress, campaignId],
    });

    if (result && result[0]) {
      const pubKey = result[0] as Types.MoveValue;

      // Handle the public key based on its type
      if (typeof pubKey === 'object' && 'vec' in pubKey) {
        // If it's a vector of u8 values
        const byteArray = (pubKey as { vec: number[] }).vec;
        const uint8Array = new Uint8Array(byteArray);
        const hexString = HexString.fromUint8Array(uint8Array).toString();

        return res.status(200).json({
          publicKey: {
            hex: hexString,
            // Also include the raw bytes in case they're needed
            bytes: Array.from(uint8Array),
          },
        });
      } else {
        // If it's already a string format
        return res.status(200).json({
          publicKey: {
            hex: pubKey.toString(),
            bytes: null,
          },
        });
      }
    }

    return res
      .status(404)
      .json({ message: 'No public key found for the specified campaign' });
  } catch (error: any) {
    console.error('Detailed error:', {
      error,
      message: error.message,
      status: error.status,
      errorCode: error.errorCode,
      vmErrorCode: error.vmErrorCode,
    });

    return res.status(500).json({
      message: 'Error fetching campaign public key',
      details: {
        errorMessage: error.message,
        errorCode: error.errorCode,
        vmErrorCode: error.vmErrorCode,
      },
    });
  }
}
