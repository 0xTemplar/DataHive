import React from 'react';
import Avvvatars from 'avvvatars-react';
import {
  HiOutlineShieldCheck,
  HiExternalLink,
  HiOutlineChartBar,
} from 'react-icons/hi';

interface ProfileBannerProps {
  walletAddress: string;
  username: string;
  reputationScore?: number;
}

const ProfileBanner: React.FC<ProfileBannerProps> = ({
  walletAddress,
  username,
  reputationScore,
}) => {
  // Determine badge color based on reputation score
  const getBadgeColor = () => {
    if (!reputationScore) return 'border-[#6366f1]';
    if (reputationScore >= 5000) return 'border-[#ec4899]'; // Platinum
    if (reputationScore >= 1000) return 'border-[#eab308]'; // Gold
    if (reputationScore >= 500) return 'border-[#94a3b8]'; // Silver
    return 'border-[#b45309]'; // Bronze
  };

  // Determine badge icon based on reputation score
  const getBadgeIcon = () => {
    if (!reputationScore)
      return <HiOutlineShieldCheck className="w-5 h-5 text-[#6366f1]" />;
    if (reputationScore >= 5000)
      return <HiOutlineShieldCheck className="w-5 h-5 text-[#ec4899]" />; // Platinum
    if (reputationScore >= 1000)
      return <HiOutlineShieldCheck className="w-5 h-5 text-[#eab308]" />; // Gold
    if (reputationScore >= 500)
      return <HiOutlineShieldCheck className="w-5 h-5 text-[#94a3b8]" />; // Silver
    return <HiOutlineShieldCheck className="w-5 h-5 text-[#b45309]" />; // Bronze
  };

  return (
    <div className="h-48 radial-gradient-border relative mb-24">
      <div className="absolute -bottom-16 left-8 flex items-end gap-6">
        <div className="relative">
          <div className="w-32 h-32 rounded-2xl bg-[#0f0f17] p-1">
            <Avvvatars value={walletAddress} style="shape" size={120} />
          </div>
          <div
            className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-[#0f0f17] flex items-center justify-center border-2 ${getBadgeColor()}`}
          >
            {getBadgeIcon()}
          </div>
        </div>
        <div className="mb-4 flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{username}</h1>
            {reputationScore && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-sm">
                <HiOutlineChartBar className="w-4 h-4 text-[#6366f1]" />
                <span>{reputationScore} Rep</span>
              </div>
            )}
          </div>
          <button
            onClick={() =>
              window.open(
                `https://explorer.aptoslabs.com/account/${walletAddress}?network=bardock+testnet`,
                '_blank'
              )
            }
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm w-fit"
          >
            {walletAddress}
            <HiExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileBanner;
