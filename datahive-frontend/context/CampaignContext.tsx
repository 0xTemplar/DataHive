import React, { createContext, useContext, useState, ReactNode } from 'react';
import { HiOutlineDocument } from 'react-icons/hi';

// Constants for fee calculations
const PLATFORM_FEE_BASIS_POINTS = 250; // 2.5% = 250 basis points

interface PlanType {
  name: string;
  icon: React.ReactNode;
  description: string;
  isPremium?: boolean;
}

interface CampaignDetailsData {
  title: string;
  description: string;
  requirements: string;
  qualityCriteria: string;
  expirationDate: string;
}

interface CampaignRewardsData {
  unitPrice: string;
  totalBudget: string;
  minDataCount: string;
  maxDataCount: string;
  isCsvOnlyCampaign: boolean;
}

interface CampaignData {
  type: PlanType | null;
  details: CampaignDetailsData;
  rewards: CampaignRewardsData;
}

interface ValidationErrors {
  type?: string;
  details?: {
    title?: string;
    description?: string;
    requirements?: string;
    qualityCriteria?: string;
    expirationDate?: string;
  };
  rewards?: {
    unitPrice?: string;
    totalBudget?: string;
    minDataCount?: string;
    maxDataCount?: string;
    isCsvOnlyCampaign?: string;
  };
}

interface CampaignContextType {
  campaignData: CampaignData;
  updateCampaignType: (type: PlanType) => void;
  updateCampaignDetails: (details: Partial<CampaignDetailsData>) => void;
  updateCampaignRewards: (rewards: Partial<CampaignRewardsData>) => void;
  resetCampaignData: () => void;
  validateStep: (step: number) => boolean;
  errors: ValidationErrors;
  clearErrors: () => void;
}

const defaultTextType: PlanType = {
  name: 'Text',
  icon: <HiOutlineDocument className="w-6 h-6 text-white" />,
  description: 'Collect text-based data from your community',
  isPremium: false,
};

const defaultCampaignData: CampaignData = {
  type: defaultTextType,
  details: {
    title: '',
    description: '',
    requirements: '',
    qualityCriteria: '',
    expirationDate: '',
  },
  rewards: {
    unitPrice: '',
    totalBudget: '',
    minDataCount: '',
    maxDataCount: '',
    isCsvOnlyCampaign: false,
  },
};

const CampaignContext = createContext<CampaignContextType | undefined>(
  undefined
);

export const CampaignProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [campaignData, setCampaignData] =
    useState<CampaignData>(defaultCampaignData);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const updateCampaignType = (type: PlanType) => {
    setCampaignData((prev) => ({
      ...prev,
      type,
    }));
    setErrors((prev) => ({ ...prev, type: undefined }));
  };

  const updateCampaignDetails = (details: Partial<CampaignDetailsData>) => {
    setCampaignData((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        ...details,
      },
    }));
    const updatedFields = Object.keys(details);
    setErrors((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        ...Object.fromEntries(updatedFields.map((field) => [field, undefined])),
      },
    }));
  };

  const updateCampaignRewards = (rewards: Partial<CampaignRewardsData>) => {
    setCampaignData((prev) => ({
      ...prev,
      rewards: {
        ...prev.rewards,
        ...rewards,
      },
    }));
    const updatedFields = Object.keys(rewards);
    setErrors((prev) => ({
      ...prev,
      rewards: {
        ...prev.rewards,
        ...Object.fromEntries(updatedFields.map((field) => [field, undefined])),
      },
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {};

    switch (step) {
      case 0:
        if (!campaignData.type) {
          newErrors.type = 'Please select a campaign type';
        }
        break;

      case 1:
        if (!campaignData.details.title.trim()) {
          newErrors.details = {
            ...newErrors.details,
            title: 'Title is required',
          };
        }
        if (!campaignData.details.description.trim()) {
          newErrors.details = {
            ...newErrors.details,
            description: 'Description is required',
          };
        }
        if (!campaignData.details.requirements.trim()) {
          newErrors.details = {
            ...newErrors.details,
            requirements: 'Requirements are required',
          };
        }
        if (!campaignData.details.qualityCriteria.trim()) {
          newErrors.details = {
            ...newErrors.details,
            qualityCriteria: 'Quality criteria is required',
          };
        }
        if (!campaignData.details.expirationDate) {
          newErrors.details = {
            ...newErrors.details,
            expirationDate: 'Expiration date is required',
          };
        }
        break;

      case 2:
        if (
          !campaignData.rewards.unitPrice ||
          parseFloat(campaignData.rewards.unitPrice) <= 0
        ) {
          newErrors.rewards = {
            ...newErrors.rewards,
            unitPrice: 'Valid reward per submission is required',
          };
        }
        if (
          !campaignData.rewards.totalBudget ||
          parseFloat(campaignData.rewards.totalBudget) <= 0
        ) {
          newErrors.rewards = {
            ...newErrors.rewards,
            totalBudget: 'Valid total budget is required',
          };
        }
        if (
          !campaignData.rewards.minDataCount ||
          parseInt(campaignData.rewards.minDataCount) <= 0
        ) {
          newErrors.rewards = {
            ...newErrors.rewards,
            minDataCount: 'Valid minimum submission count is required',
          };
        }
        if (
          !campaignData.rewards.maxDataCount ||
          parseInt(campaignData.rewards.maxDataCount) <= 0
        ) {
          newErrors.rewards = {
            ...newErrors.rewards,
            maxDataCount: 'Valid maximum submission count is required',
          };
        }
        if (
          parseInt(campaignData.rewards.maxDataCount) <=
          parseInt(campaignData.rewards.minDataCount)
        ) {
          newErrors.rewards = {
            ...newErrors.rewards,
            maxDataCount: 'Maximum submissions must be greater than minimum',
          };
        }

        // Calculate total cost including platform fees
        const maxSubmissions = parseInt(campaignData.rewards.maxDataCount);
        const rewardPerSubmission = parseFloat(campaignData.rewards.unitPrice);
        const totalRewards = maxSubmissions * rewardPerSubmission;
        const platformFees = (totalRewards * PLATFORM_FEE_BASIS_POINTS) / 10000;
        const totalCostWithFees = totalRewards + platformFees;

        if (totalCostWithFees > parseFloat(campaignData.rewards.totalBudget)) {
          newErrors.rewards = {
            ...newErrors.rewards,
            totalBudget: `Total budget must be at least ${totalCostWithFees.toFixed(
              2
            )} DHT to cover rewards and platform fees`,
          };
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetCampaignData = () => {
    setCampaignData(defaultCampaignData);
    setErrors({});
  };

  const clearErrors = () => {
    setErrors({});
  };

  return (
    <CampaignContext.Provider
      value={{
        campaignData,
        updateCampaignType,
        updateCampaignDetails,
        updateCampaignRewards,
        resetCampaignData,
        validateStep,
        errors,
        clearErrors,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
};
