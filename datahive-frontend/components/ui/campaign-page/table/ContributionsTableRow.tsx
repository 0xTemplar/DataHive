import React, { useState } from 'react';
import Image from 'next/image';
import { BsArrowRight } from 'react-icons/bs';
import { HiShieldCheck, HiClock, HiExclamation } from 'react-icons/hi';
import Avvvatars from 'avvvatars-react';
import { octasToMove } from '@/utils/aptos/octasToMove';
import DecryptSubmissionModal from '@/components/modals/DecryptSubmissionModal';
import useCampaignStore from '@/helpers/store/useCampaignStore';

interface Creator {
  avatar: string;
  name: string;
  address: string;
  reputation: number;
}

interface Contribution {
  creator: Creator;
  verificationStatus: 'Verified' | 'Pending' | 'Rejected';
  verifierReputation: number;
  qualityScore: number;
  rewardStatus: 'Released' | 'Pending' | 'Failed';
  dataUrl: string;
  submittedAt: string;
  rewardAmount: number;
}

interface ContributionsTableRowProps {
  contribution: Contribution;
}

const ContributionsTableRow: React.FC<ContributionsTableRowProps> = React.memo(
  ({ contribution }) => {
    const [isDecryptModalOpen, setIsDecryptModalOpen] = useState(false);
    const { campaign } = useCampaignStore();
    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'Verified':
          return <HiShieldCheck className="w-4 h-4 text-green-400" />;
        case 'Pending':
          return <HiClock className="w-4 h-4 text-yellow-400" />;
        case 'Rejected':
          return <HiExclamation className="w-4 h-4 text-red-400" />;
        default:
          return null;
      }
    };

    const getReputationColor = (score: number) => {
      if (score >= 900) return 'text-yellow-500';
      if (score >= 700) return 'text-purple-400';
      if (score >= 500) return 'text-blue-400';
      return 'text-gray-400';
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    };

    return (
      <>
        <tr className="hover:bg-[#f5f5fa08] transition-colors">
          <td className="py-4 px-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avvvatars value={contribution.creator.address} size={40} />
                <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-[#0f0f17] border-2 border-[#6366f1]">
                  <HiShieldCheck
                    className={`w-3 h-3 ${getReputationColor(
                      contribution.creator.reputation
                    )}`}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[#f5f5faf4] text-sm font-medium">
                    {contribution.creator.name}
                  </span>
                  <span className="text-[#f5f5fa7a] text-xs">
                    {/* {contribution.creator.address} */}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[#f5f5fa4a] text-xs">
                    Reputation Score
                  </span>
                  <span
                    className={`text-xs ${getReputationColor(
                      contribution.creator.reputation
                    )}`}
                  >
                    {contribution.creator.reputation}
                  </span>
                </div>
              </div>
            </div>
          </td>
          <td className="py-4 px-6">
            <div className="flex items-center gap-2">
              {getStatusIcon(contribution.verificationStatus)}
              <span
                className={`text-sm ${
                  contribution.verificationStatus === 'Verified'
                    ? 'text-green-400'
                    : contribution.verificationStatus === 'Pending'
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {contribution.verificationStatus}
              </span>
            </div>
          </td>
          <td className="py-4 px-6">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 bg-[#f5f5fa14] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-full"
                  style={{ width: `${contribution.verifierReputation}%` }}
                />
              </div>
              <span className="text-[#f5f5faf4] text-sm font-medium">
                {contribution.verifierReputation}%
              </span>
            </div>
          </td>
          <td className="py-4 px-6">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 bg-[#f5f5fa14] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-full"
                  style={{ width: `${contribution.qualityScore}%` }}
                />
              </div>
              <span className="text-[#f5f5faf4] text-sm font-medium">
                {contribution.qualityScore}%
              </span>
            </div>
          </td>
          <td className="py-4 px-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${
                    contribution.rewardStatus === 'Released'
                      ? 'text-green-400'
                      : contribution.rewardStatus === 'Pending'
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`}
                >
                  {contribution.rewardAmount}{' '}
                  <span className="text-[10px]">DHT</span>
                </span>
              </div>
              <span className="text-gray-400 text-xs">
                {contribution.rewardStatus}
              </span>
            </div>
          </td>
          <td className="py-4 px-6">
            <span className="text-[#f5f5fa7a] text-sm">
              {formatDate(contribution.submittedAt)}
            </span>
          </td>
          <td className="py-4 px-6">
            <button
              onClick={() => setIsDecryptModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f5f5fa14] hover:bg-[#f5f5fa1a] transition-colors text-[#f5f5faf4] text-xs"
            >
              View
              <BsArrowRight className="w-4 h-4" />
            </button>
          </td>
        </tr>

        <DecryptSubmissionModal
          isOpen={isDecryptModalOpen}
          onClose={() => setIsDecryptModalOpen(false)}
          ipfsHash={contribution.dataUrl}
        />
      </>
    );
  }
);

ContributionsTableRow.displayName = 'ContributionsTableRow';

export default ContributionsTableRow;
