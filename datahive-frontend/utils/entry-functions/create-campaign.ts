import { InputTransactionData } from '@aptos-labs/wallet-adapter-react';
import { moveToOctas } from '@/utils/aptos/octasToMove';
import { TxnBuilderTypes } from 'aptos';

export interface CreateCampaignArguments {
  campaignId: string;
  title: string;
  description: string;
  dataRequirements: string;
  qualityCriteria: string;
  unitPrice: number;
  totalBudget: number;
  minDataCount: number;
  maxDataCount: number;
  expirationDate: Date;
  metadataUri: string;
  encryptionPubKey: Uint8Array;
}

// Helper function to convert Date to seconds
const dateToSeconds = (date: Date): number => {
  return Math.floor(date.getTime() / 1000);
};

// Fixed platform fee in basis points (2.5% = 250)
const PLATFORM_FEE_BASIS_POINTS = 250;

/**
 * Creates a campaign using the wallet adapter format
 */
export const createCampaign = (
  args: CreateCampaignArguments
): InputTransactionData => {
  const {
    campaignId,
    title,
    description,
    dataRequirements,
    qualityCriteria,
    unitPrice,
    totalBudget,
    minDataCount,
    maxDataCount,
    expirationDate,
    metadataUri,
    encryptionPubKey,
  } = args;

  return {
    data: {
      function: `${process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS}::campaign::create_campaign`,
      typeArguments: ['0x1::aptos_coin::AptosCoin'],
      functionArguments: [
        campaignId,
        title,
        description,
        dataRequirements,
        qualityCriteria,
        moveToOctas(unitPrice), // Convert MOVE to Octas
        moveToOctas(totalBudget), // Convert MOVE to Octas
        minDataCount,
        maxDataCount,
        dateToSeconds(expirationDate),
        metadataUri,
        PLATFORM_FEE_BASIS_POINTS,
        Array.from(encryptionPubKey), // Convert Uint8Array to regular array
      ],
    },
  };
};
