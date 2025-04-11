import React from 'react';
import { HiCurrencyDollar, HiScale, HiChartBar } from 'react-icons/hi';
import { useCampaign } from '@/context/CampaignContext';

interface CampaignRewardsData {
  unitPrice: string;
  totalBudget: string;
  minDataCount: string;
  maxDataCount: string;
}

const CampaignRewards = () => {
  const { campaignData, updateCampaignRewards, errors } = useCampaign();
  const { rewards } = campaignData;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      updateCampaignRewards({ [name]: value });
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      <form className="space-y-8 ml-24">
        {/* Budget Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7]">
              <HiCurrencyDollar className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[#f5f5faf4]">
              Budget Settings
            </h3>
          </div>

          {/* Total Budget Input with Gradient Border */}
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-2xl opacity-75 blur"></div>
            <div className="relative p-6 bg-[#0f0f17] rounded-xl space-y-2">
              <label className="block text-sm font-medium text-[#f5f5faf4]">
                Total Budget (DHT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="totalBudget"
                  value={rewards.totalBudget}
                  onChange={handleChange}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl bg-[#f5f5fa14] border ${
                    errors.rewards?.totalBudget
                      ? 'border-red-500'
                      : 'border-[#f5f5fa14]'
                  } text-[#f5f5faf4] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-transparent placeholder-[#f5f5fa4a] transition-all duration-200`}
                  placeholder="Enter total campaign budget"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-[#f5f5fa7a]">Ⓜ</span>
                </div>
              </div>
              {errors.rewards?.totalBudget && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.rewards.totalBudget}
                </p>
              )}
              <p className="text-xs text-[#f5f5fa7a] mt-2">
                This is the maximum amount you&apos;re willing to spend on this
                campaign
              </p>
            </div>
          </div>

          {/* Data Count Range Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7]">
                <HiChartBar className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#f5f5faf4]">
                Submission Limits
              </h3>
            </div>

            <div className="bg-[#f5f5fa08] p-6 rounded-xl border border-[#f5f5fa14] space-y-4">
              <div className="flex items-center gap-4">
                <HiScale className="w-5 h-5 text-[#a855f7]" />
                <span className="text-sm font-medium text-[#f5f5faf4]">
                  Set your target range
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#f5f5fa7a]">
                    Minimum
                  </label>
                  <input
                    type="number"
                    name="minDataCount"
                    value={rewards.minDataCount}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl bg-[#f5f5fa14] border ${
                      errors.rewards?.minDataCount
                        ? 'border-red-500'
                        : 'border-[#f5f5fa14]'
                    } text-[#f5f5faf4] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-transparent placeholder-[#f5f5fa4a] transition-all duration-200`}
                    placeholder="Min submissions"
                  />
                  {errors.rewards?.minDataCount && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.rewards.minDataCount}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#f5f5fa7a]">
                    Maximum
                  </label>
                  <input
                    type="number"
                    name="maxDataCount"
                    value={rewards.maxDataCount}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl bg-[#f5f5fa14] border ${
                      errors.rewards?.maxDataCount
                        ? 'border-red-500'
                        : 'border-[#f5f5fa14]'
                    } text-[#f5f5faf4] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-transparent placeholder-[#f5f5fa4a] transition-all duration-200`}
                    placeholder="Max submissions"
                  />
                  {errors.rewards?.maxDataCount && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.rewards.maxDataCount}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <div className="flex-shrink-0 w-1 h-1 rounded-full bg-[#a855f7]"></div>
                <p className="text-xs text-[#f5f5fa7a]">
                  Campaign will automatically close when maximum submissions are
                  reached
                </p>
              </div>
            </div>
          </div>

          {/* Unit Price Input */}
          <div className="relative group">
            <label className="block text-sm font-medium text-[#f5f5faf4] mb-2">
              Reward per Submission (DHT)
            </label>
            <div className="relative">
              <input
                type="number"
                name="unitPrice"
                value={rewards.unitPrice}
                onChange={handleChange}
                className={`w-full pl-12 pr-4 py-3 rounded-xl bg-[#f5f5fa14] border ${
                  errors.rewards?.unitPrice
                    ? 'border-red-500'
                    : 'border-[#f5f5fa14]'
                } text-[#f5f5faf4] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-transparent placeholder-[#f5f5fa4a] transition-all duration-200`}
                placeholder="Enter reward amount per submission"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-[#f5f5fa7a]">Ⓜ</span>
              </div>
            </div>
            {errors.rewards?.unitPrice && (
              <p className="text-red-500 text-sm mt-1">
                {errors.rewards.unitPrice}
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CampaignRewards;
