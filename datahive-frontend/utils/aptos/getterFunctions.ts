import { AptosClient, Types } from 'aptos';

export const getRemainingCampaignAmount = async (
  campaignId: string
): Promise<{
  remainingBudgetOctas: string;
  remainingBudgetMove: number;
} | null> => {
  try {
    const response = await fetch(
      `/api/campaign/getRemainingBudget?campaignId=${campaignId}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error:', error);
      return null;
    }

    const data = await response.json();
    return {
      remainingBudgetOctas: data.remainingBudgetOctas,
      remainingBudgetMove: data.remainingBudgetMove,
    };
  } catch (error) {
    console.error('Error fetching campaign remaining amount:', error);
    return null;
  }
};
