import React, { useState } from 'react';
import ContributionsTable from '../table/ContributionsTable';
import { IoCloudDownloadOutline } from 'react-icons/io5';
import { HiSparkles } from 'react-icons/hi';
import BulkExportModal from '@/components/modals/BulkExportModal';
import toast from 'react-hot-toast';

interface Campaign {
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
  bucket_name?: string;
}

interface ContributionsProps {
  campaign: Campaign;
  isLoading?: boolean;
}

// Skeleton loader for the Contributions tab
export const ContributionsSkeleton: React.FC = () => {
  return (
    <div className="w-[1100px]">
      <div className="h-7 w-64 bg-[#f5f5fa14] rounded animate-pulse mb-4"></div>
      <div className="flex gap-2">
        <div className="relative">
          <div className="h-10 w-32 bg-[#f5f5fa0a] rounded animate-pulse mt-4"></div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="mt-6 border border-[#f5f5fa14] rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="bg-[#f5f5fa0a] p-4 flex">
          <div className="h-6 w-1/6 bg-[#f5f5fa14] rounded animate-pulse"></div>
          <div className="h-6 w-1/6 bg-[#f5f5fa14] rounded animate-pulse ml-4"></div>
          <div className="h-6 w-1/6 bg-[#f5f5fa14] rounded animate-pulse ml-4"></div>
          <div className="h-6 w-1/6 bg-[#f5f5fa14] rounded animate-pulse ml-4"></div>
          <div className="h-6 w-1/6 bg-[#f5f5fa14] rounded animate-pulse ml-4"></div>
        </div>

        {/* Table Rows */}
        {[...Array(5)].map((_, index) => (
          <div key={index} className="border-t border-[#f5f5fa14] p-4 flex">
            <div className="h-6 w-1/6 bg-[#f5f5fa0a] rounded animate-pulse"></div>
            <div className="h-6 w-1/6 bg-[#f5f5fa0a] rounded animate-pulse ml-4"></div>
            <div className="h-6 w-1/6 bg-[#f5f5fa0a] rounded animate-pulse ml-4"></div>
            <div className="h-6 w-1/6 bg-[#f5f5fa0a] rounded animate-pulse ml-4"></div>
            <div className="h-6 w-1/6 bg-[#f5f5fa0a] rounded animate-pulse ml-4"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Contributions: React.FC<ContributionsProps> = ({
  campaign,
  isLoading,
}) => {
  const [isBulkExportOpen, setIsBulkExportOpen] = useState(false);
  const [contributions, setContributions] = useState<any[]>([]); // We'll get this from ContributionsTable

  // If loading, show skeleton
  if (isLoading) {
    return <ContributionsSkeleton />;
  }

  const handleExportClick = () => {
    if (contributions.length === 0) {
      toast.error('No contributions to export');
      return;
    }
    setIsBulkExportOpen(true);
  };

  return (
    <div className="w-[1100px]">
      <h2 className="text-white text-lg font-semibold tracking-[2px]">
        Campaign Contributions
      </h2>
      <div className="flex gap-2">
        <div className="relative">
          <button
            onClick={handleExportClick}
            className="gradient-border p-2 mt-4 text-xs font-semibold flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <IoCloudDownloadOutline className="text-white" />
            Export data
            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-[#6366f1] to-[#a855f7] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
              <HiSparkles className="w-3 h-3 text-white" />
              <span className="text-[10px] font-bold text-white">PREMIUM</span>
            </div>
          </button>
        </div>
      </div>
      <ContributionsTable onContributionsChange={setContributions} />

      <BulkExportModal
        isOpen={isBulkExportOpen}
        onClose={() => setIsBulkExportOpen(false)}
        contributions={contributions}
        bucketName={campaign.bucket_name || 'fake_news_detection'}
        campaignId={campaign.campaign_id}
      />
    </div>
  );
};

export default Contributions;
