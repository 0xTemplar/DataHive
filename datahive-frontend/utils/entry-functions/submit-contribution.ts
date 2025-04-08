import { InputTransactionData } from '@aptos-labs/wallet-adapter-react';
import crypto from 'crypto';
import axios from 'axios';

export interface SubmitContributionArguments {
  campaignId: string;
  dataUrl: string;
  score: number;
  contributionId?: string; // Optional to maintain backward compatibility
}

/**
 * Generates a unique contribution ID using timestamp and random bytes
 */
const generateContributionId = (): string => {
  return `contribution_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
};

/**
 * Calculates SHA-256 hash of the data URL
 */
const calculateDataHash = (dataUrl: string): number[] => {
  return Array.from(crypto.createHash('sha256').update(dataUrl).digest());
};

/**
 * Creates a contribution submission using the wallet adapter format
 */
export const submitContribution = async (
  args: SubmitContributionArguments
): Promise<InputTransactionData> => {
  const { campaignId, dataUrl, score, contributionId: providedId } = args;

  // Use provided ID or generate a new one
  const contributionId = providedId || generateContributionId();

  // Calculate data hash
  const dataHash = calculateDataHash(dataUrl);

  // Round the score to the nearest whole number
  const roundedScore = Math.round(score);

  // Get signature from API
  const signatureResponse = await axios.post(
    '/api/submission/generate-signature',
    {
      campaignId,
      dataUrl,
      score: roundedScore,
    }
  );

  if (!signatureResponse.data.signature) {
    throw new Error('Failed to generate signature');
  }

  return {
    data: {
      function: `${process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS}::contribution::submit_contribution`,
      typeArguments: ['0x1::aptos_coin::AptosCoin'],
      functionArguments: [
        campaignId,
        contributionId,
        dataUrl,
        dataHash,
        signatureResponse.data.signature,
        signatureResponse.data.qualityScore,
      ],
    },
  };
};
