import { useState } from 'react';
import {
  HiOutlineDocument,
  HiOutlinePhotograph,
  HiLockClosed,
} from 'react-icons/hi';

interface PlanType {
  name: string;
  icon: React.ReactNode;
  description: string;
  isPremium?: boolean;
}

interface TypeSelectorProps {
  types: PlanType[];
  selectedType: PlanType | null;
  disabled?: boolean;
  premiumEnabled?: boolean;
  onTypeChange?: (type: PlanType) => void;
}

const plans: PlanType[] = [
  {
    name: 'Text',
    icon: <HiOutlineDocument className="w-6 h-6" />,
    description: 'Collect text-based data from users',
  },
  {
    name: 'Image',
    icon: <HiOutlinePhotograph className="w-6 h-6" />,
    description: 'Gather image-based content and media',
    isPremium: true,
  },
];

export function TypeSelector({
  types,
  selectedType,
  disabled = true,
  premiumEnabled = false,
  onTypeChange,
}: TypeSelectorProps) {
  const handleTypeClick = (plan: PlanType) => {
    if (disabled || (plan.isPremium && !premiumEnabled)) {
      return;
    }
    onTypeChange?.(plan);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className={`grid grid-cols-2 gap-4 ${disabled ? 'opacity-60' : ''}`}>
        {types.map((plan) => {
          const isPlanDisabled =
            disabled || (plan.isPremium && !premiumEnabled);
          const isSelected = selectedType?.name === plan.name;

          return (
            <button
              key={plan.name}
              onClick={() => handleTypeClick(plan)}
              disabled={isPlanDisabled}
              type="button"
              className={`
                relative flex w-full text-left rounded-xl border p-4
                transition-all duration-200 ease-in-out focus:outline-none
                ${
                  isPlanDisabled
                    ? 'cursor-not-allowed border-[#f5f5fa14] bg-[#f5f5fa08]'
                    : isSelected
                    ? 'border-[#a855f7] bg-[#6366f114]'
                    : 'border-[#f5f5fa14]  hover:bg-[#f5f5fa14]'
                }
              `}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={`
                      flex h-10 w-10 items-center justify-center rounded-lg
                      ${
                        isPlanDisabled
                          ? 'bg-[#f5f5fa14] text-[#f5f5fa4a]'
                          : isSelected
                          ? 'bg-[#a855f7] text-white'
                          : 'bg-[#f5f5fa14] text-[#f5f5faf4]'
                      }
                    `}
                  >
                    {plan.isPremium && !premiumEnabled ? (
                      <HiLockClosed className="w-5 h-5" />
                    ) : (
                      plan.icon
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isPlanDisabled
                            ? 'text-[#f5f5fa4a]'
                            : 'text-[#f5f5faf4]'
                        }`}
                      >
                        {plan.name}
                      </span>
                      {plan.isPremium && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white">
                          PREMIUM
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs ${
                        isPlanDisabled ? 'text-[#f5f5fa4a]' : 'text-[#f5f5fa7a]'
                      }`}
                    >
                      {plan.description}
                    </p>
                  </div>
                </div>
                <div
                  className={`shrink-0 ${
                    isPlanDisabled
                      ? 'text-[#f5f5fa4a]'
                      : isSelected
                      ? 'text-[#a855f7]'
                      : 'text-[#f5f5fa14]'
                  }`}
                >
                  <div className="h-6 w-6 rounded-full border-2 flex items-center justify-center">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        !isPlanDisabled && isSelected ? 'bg-[#a855f7]' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>
              {plan.isPremium && !premiumEnabled && (
                <div className="absolute -top-2 -right-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] flex items-center justify-center">
                    <HiLockClosed className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
