import React, { useState } from 'react';
import { TypeSelector } from './step-components/TypeSelector';
import { useCampaign } from '@/context/CampaignContext';
import { HiOutlineDocument, HiOutlinePhotograph } from 'react-icons/hi';
import { useSubscription } from '@/context/SubscriptionContext';

interface PlanType {
  name: string;
  icon: React.ReactNode;
  description: string;
  isPremium?: boolean;
}

const campaignTypes: PlanType[] = [
  {
    name: 'Text',
    icon: <HiOutlineDocument className="w-6 h-6 text-white" />,
    description: 'Collect text-based data from your community',
    isPremium: false,
  },
  {
    name: 'Image',
    icon: <HiOutlinePhotograph className="w-6 h-6 text-white" />,
    description: 'Collect image-based data from your community',
    isPremium: true,
  },
];

const CampaignType = () => {
  const [isDisabled, setIsDisabled] = useState(false);
  const { updateCampaignType, errors, campaignData } = useCampaign();
  const { isSubscribed } = useSubscription();

  // Set premium enabled based on subscription status
  const isPremiumEnabled = isSubscribed;

  const handleTypeChange = (type: PlanType) => {
    updateCampaignType(type);
  };

  // Test controls for debugging
  const toggleDisabled = () => setIsDisabled((prev) => !prev);

  return (
    <div className="w-[898px] mx-auto">
      <div className="flex flex-col items-center">
        <h1 className="text-white text-lg font-semibold text-center">
          What type of campaign would you like to create?
        </h1>
        <p className="text-gray-300 text-sm font-semibold mt-4">
          Select the type of campaign you want to create
        </p>

        {errors.type && (
          <p className="text-red-500 text-sm mt-2">{errors.type}</p>
        )}

        {/* Uncomment for testing premium features */}
        {/* <div className="flex gap-4 mb-4">
          <button
            onClick={toggleDisabled}
            className="px-4 py-2 text-sm rounded-md bg-gray-700 text-white"
          >
            {isDisabled ? 'Enable' : 'Disable'} Selection
          </button>
        </div> */}

        {/* {!isSubscribed && (
          <div className="mt-4 p-3 bg-amber-900/30 border border-amber-700/50 rounded-md text-amber-200 text-sm">
            <p>
              Image campaign types require an active subscription.{' '}
              <a
                href="/subscription"
                className="underline hover:text-amber-100"
              >
                Upgrade now
              </a>{' '}
              to access all features.
            </p>
          </div>
        )} */}

        <div className="flex justify-center gap-16 mt-9 ml-16">
          <TypeSelector
            types={campaignTypes}
            selectedType={campaignData.type}
            disabled={isDisabled}
            premiumEnabled={isSubscribed}
            onTypeChange={handleTypeChange}
          />
        </div>
      </div>
    </div>
  );
};

export default CampaignType;
