import React from 'react';
import Avvvatars from 'avvvatars-react';
import Link from 'next/link';
import { truncateAddress } from '@aptos-labs/wallet-adapter-react';

interface CampaignCardProps {
  campaign: {
    campaign_id: string;
    campaign_type: string;
    onchain_campaign_id: string;
    creator_wallet_address: string;
    current_contributions: number;
    description: string;
    expiration: number;
    is_active: boolean;
    max_data_count: number;
    title: string;
    total_budget: number;
    unit_price: number;
  };
}

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign }) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Link
      href={`/detailed-campaign/${campaign.onchain_campaign_id}`}
      className="radial-gradient-border border border-gray-800 rounded-xl p-6 h-[260px] cursor-pointer hover:opacity-90 transition-opacity"
    >
      <div>
        <div className="inner-content">
          <div className="flex items-center gap-3">
            <Avvvatars
              value={campaign.creator_wallet_address}
              style="shape"
              size={50}
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-white text-sm truncate">{campaign.title}</h2>
              <p className="text-gray-400 text-xs mt-0.5">
                Creator: {truncateAddress(campaign.creator_wallet_address)}
              </p>
            </div>
            {campaign.is_active && (
              <span className="absolute top-0 right-0 bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white text-xs p-1 px-3 rounded-md rounded-bl-[20px] rounded-l-none rounded-tr-[20px]">
                {campaign.campaign_type} Campaign
              </span>
            )}
          </div>

          <div>
            <ul className="flex items-center gap-2 text-xs mt-3">
              <li className="bg-[#21262d] p-1 px-3 rounded-md">Data</li>
              <li className="bg-[#21262d] p-1 px-3 rounded-md">
                AI Verification
              </li>
              <li className="bg-[#21262d] p-1 px-3 rounded-md">
                Data Verification
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 ml-2">
            <div className="border-r border-b border-gray-800">
              <p className="text-gray-400 text-xs">Total Contributions</p>
              <p className="text-white font-medium mt-1">
                {campaign.current_contributions}
              </p>
            </div>
            <div className="border-b pb-2 border-gray-800 pl-9">
              <p className="text-gray-400 text-xs">Campaign Budget</p>
              <p className="text-white font-medium mt-1">
                {campaign.total_budget} DHT
              </p>
            </div>
            <div className="border-r border-gray-800">
              <p className="text-gray-400 text-xs">Max Data Count</p>
              <p className="text-white font-medium mt-1">
                {campaign.max_data_count}
              </p>
            </div>
            <div className="pl-9">
              <p className="text-gray-400 text-xs">Expiration Date</p>
              <p className="text-white font-medium mt-1">
                {formatDate(campaign.expiration)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CampaignCard;
