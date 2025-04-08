import React from 'react';
import {
  HiOutlineDocument,
  HiOutlineCash,
  HiOutlineCalendar,
  HiOutlinePhotograph,
  HiOutlineClipboardCheck,
  HiOutlineChartBar,
  HiOutlineCurrencyDollar,
  HiInformationCircle,
} from 'react-icons/hi';
import { useCampaign } from '@/context/CampaignContext';

const CampaignReview = () => {
  const { campaignData } = useCampaign();
  const { type, details, rewards } = campaignData;

  // Calculate fees using basis points (fixed at 2.5% = 250 basis points)
  const PLATFORM_FEE_BASIS_POINTS = 250; // 2.5% = 250 basis points
  const totalBudgetNumber = parseFloat(rewards.totalBudget) || 0;
  const maxSubmissions = parseInt(rewards.maxDataCount) || 0;
  const rewardPerSubmission = parseFloat(rewards.unitPrice) || 0;

  // Calculate total rewards
  const totalRewards = maxSubmissions * rewardPerSubmission;

  // Calculate platform fee: (amount * basis_points) / 10000
  const platformFee = (totalRewards * PLATFORM_FEE_BASIS_POINTS) / 10000;
  const platformFeePercentage = (PLATFORM_FEE_BASIS_POINTS / 100).toFixed(1);

  return (
    <div className="w-full max-w-3xl mx-auto p-6">
      <div className="space-y-8 ml-24">
        {/* Campaign Type Section */}
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-2xl opacity-75 blur"></div>
          <div className="relative p-6 bg-[#0f0f17] rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7]">
                {type?.name === 'Text' ? (
                  <HiOutlineDocument className="w-6 h-6 text-white" />
                ) : (
                  <HiOutlinePhotograph className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f5f5faf4]">
                  {type?.name} Campaign
                </h3>
                <p className="text-sm text-[#f5f5fa7a]">Data Collection Type</p>
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Details Section */}
        <div className="bg-[#f5f5fa08] rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineClipboardCheck className="w-5 h-5 text-[#a855f7]" />
            <h3 className="text-lg font-semibold text-[#f5f5faf4]">
              Campaign Details
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-[#f5f5fa7a]">Title</span>
              <p className="text-[#f5f5faf4] font-medium">{details.title}</p>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm text-[#f5f5fa7a]">Description</span>
              <p className="text-[#f5f5faf4]">{details.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-[#f5f5fa7a]">Requirements</span>
                <p className="text-[#f5f5faf4]">{details.requirements}</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-[#f5f5fa7a]">
                  Quality Criteria
                </span>
                <p className="text-[#f5f5faf4]">{details.qualityCriteria}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <HiOutlineCalendar className="w-5 h-5 text-[#a855f7]" />
              <span className="text-[#f5f5faf4]">
                Expires: {details.expirationDate}
              </span>
            </div>
          </div>
        </div>

        {/* Rewards Section */}
        <div className="bg-[#f5f5fa08] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <HiOutlineCash className="w-5 h-5 text-[#a855f7]" />
            <h3 className="text-lg font-semibold text-[#f5f5faf4]">
              Rewards & Limits
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-[#f5f5fa7a]">
                  Reward per Submission
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[#f5f5faf4] font-medium text-lg">
                    {rewards.unitPrice}
                  </span>
                  <span className="text-[#f5f5fa7a]">MOVE</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-[#f5f5fa7a]">Total Budget</span>
                <div className="flex items-center gap-1">
                  <span className="text-[#f5f5faf4] font-medium text-lg">
                    {rewards.totalBudget}
                  </span>
                  <span className="text-[#f5f5fa7a]">MOVE</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-[#f5f5fa7a]">
                  Submission Range
                </span>
                <div className="flex items-center gap-2">
                  <HiOutlineChartBar className="w-5 h-5 text-[#a855f7]" />
                  <span className="text-[#f5f5faf4]">
                    {rewards.minDataCount} - {rewards.maxDataCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fee Summary Section */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineCurrencyDollar className="w-5 h-5 text-[#a855f7]" />
            <h3 className="text-lg font-semibold text-[#f5f5faf4]">
              Fee Summary
            </h3>
          </div>

          <div className="bg-[#f5f5fa08] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#f5f5fa14]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f5f5fa7a] uppercase tracking-wider">
                    Fee Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f5f5fa7a] uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#f5f5fa7a] uppercase tracking-wider">
                    Amount (MOVE)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f5fa14]">
                <tr>
                  <td className="px-6 py-4 text-sm text-[#f5f5faf4] flex items-center gap-2">
                    Platform Fee
                    <span className="text-xs text-[#f5f5fa7a]">(Fixed)</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#f5f5fa7a]">
                    {platformFeePercentage}%
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-[#f5f5faf4]">
                    {platformFee.toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-[#f5f5fa14]">
                  <td className="px-6 py-4 text-sm font-medium text-[#f5f5faf4]">
                    Total Rewards
                  </td>
                  <td className="px-6 py-4 text-sm text-[#f5f5fa7a]">
                    {maxSubmissions} × {rewardPerSubmission} MOVE
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-[#f5f5faf4]">
                    {totalRewards.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-[#f5f5faf4]">
                    Total Cost
                  </td>
                  <td className="px-6 py-4 text-sm text-[#f5f5fa7a]">
                    Rewards + Fees
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-[#f5f5faf4]">
                    {(totalRewards + platformFee).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <HiInformationCircle className="w-4 h-4 text-[#f5f5fa7a]" />
            <p className="text-xs text-[#f5f5fa7a]">
              Fixed platform fee of {platformFeePercentage}% (
              {PLATFORM_FEE_BASIS_POINTS} basis points) is calculated on the
              total rewards amount
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignReview;
