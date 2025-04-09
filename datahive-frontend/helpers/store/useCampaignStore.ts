import { create } from 'zustand';

export interface Campaign {
  unique_contributions_count: number;
  campaign_id: string;
  campaign_type: string;
  created_at: string;
  creator_wallet_address: string;
  current_contributions: number;
  data_requirements: string;
  description: string;
  expiration: number;
  is_active: boolean;
  max_data_count: number;
  metadata_uri: string;
  min_data_count: number;
  onchain_campaign_id: string;
  platform_fee: number;
  quality_criteria: string;
  title: string;
  total_budget: number;
  transaction_hash: string;
  unit_price: number;
}

interface CampaignState {
  campaign: Campaign | null;
  isLoading: boolean;
  error: string | null;
  setCampaign: (campaign: Campaign) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetCampaign: () => void;
}

const useCampaignStore = create<CampaignState>((set) => ({
  campaign: null,
  isLoading: false,
  error: null,
  setCampaign: (campaign) => set({ campaign, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, campaign: null }),
  resetCampaign: () => set({ campaign: null, error: null, isLoading: false }),
}));

export default useCampaignStore;
