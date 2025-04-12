import React from 'react';
import {
  HiCurrencyDollar,
  HiUsers,
  HiDocumentText,
  HiChartPie,
  HiArrowSmUp,
  HiArrowSmDown,
} from 'react-icons/hi';

interface PaymentBreakdownProps {
  totalBudget: number;
  contributorsCount: number;
  submissionsCount: number;
  currency?: string;
  remainingBudget?: number;
  maxSubmissions?: number;
}

const PaymentBreakdown = ({
  totalBudget,
  contributorsCount,
  submissionsCount,
  currency = 'DHT',
  remainingBudget,
  maxSubmissions,
}: PaymentBreakdownProps) => {
  // Calculate spent budget
  const actualRemainingBudget = remainingBudget || 0;
  const spentBudget = totalBudget - actualRemainingBudget;
  const spentPercentage =
    totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0;

  // Calculate progress percentage for submissions
  const submissionPercentage = maxSubmissions
    ? (submissionsCount / maxSubmissions) * 100
    : 0;

  return (
    <div className="radial-gradient-border rounded-xl p-6 w-[370px]">
      <div className="inner-content space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#a855f7]">
              <HiCurrencyDollar className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-[#f5f5faf4] text-lg font-semibold">
              Payment Breakdown
            </h3>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#f5f5fa14]">
            <span className="text-[#f5f5faf4] text-xs font-medium">
              {currency}
            </span>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-[#f5f5fa7a] text-xs">Total Budget</span>
              <div className="flex items-center gap-2">
                <span className="text-[#f5f5faf4] text-xl font-semibold">
                  {totalBudget} <span className="text-xs">{currency}</span>
                </span>
                <HiChartPie className="w-4 h-4 text-[#a855f7]" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#f5f5fa7a] text-xs">Contributors</span>
              <div className="flex items-center gap-2">
                <span className="text-[#f5f5faf4] text-xl font-semibold">
                  {contributorsCount}
                </span>
                <HiUsers className="w-4 h-4 text-[#6366f1]" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-[#f5f5fa7a] text-xs">
                Total Data Contributed
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[#f5f5faf4] text-xl font-semibold">
                  {submissionsCount}
                  {maxSubmissions && (
                    <span className="text-xs text-[#f5f5fa7a] ml-1">
                      / {maxSubmissions}
                    </span>
                  )}
                </span>
                <HiDocumentText className="w-4 h-4 text-[#6366f1]" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#f5f5fa7a] text-xs">Remaining Budget</span>
              <div className="flex items-center gap-2">
                <span className="text-[#f5f5faf4] text-xl font-semibold">
                  {actualRemainingBudget}
                  <span className="text-xs text-[#f5f5faf4] ml-1">
                    {currency}
                  </span>
                </span>
                <HiArrowSmUp className="w-4 h-4 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          {/* Budget Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#f5f5fa7a] text-xs">
                Budget Utilization
              </span>
              <span className="text-[#f5f5faf4] text-xs font-medium">
                {`${spentPercentage.toFixed(1)}%`}
              </span>
            </div>
            <div className="h-2 w-full bg-[#f5f5fa14] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-full transition-all duration-500"
                style={{ width: `${spentPercentage}%` }}
              />
            </div>
          </div>

          {/* Submission Progress */}
          {maxSubmissions && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#f5f5fa7a] text-xs">
                  Submission Capacity
                </span>
                <span className="text-[#f5f5faf4] text-xs font-medium">
                  {`${submissionPercentage.toFixed(1)}%`}
                </span>
              </div>
              <div className="h-2 w-full bg-[#f5f5fa14] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-full transition-all duration-500"
                  style={{ width: `${submissionPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#f5f5fa14]">
          <div className="flex flex-col gap-1">
            <span className="text-[#f5f5fa7a] text-xs">Budget Spent</span>
            <div className="flex items-center gap-2">
              <span className="text-[#f5f5faf4] text-sm font-medium">
                {`${spentBudget.toFixed(2)} ${currency}`}
              </span>
              <HiArrowSmDown className="w-4 h-4 text-[#a855f7]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentBreakdown;
