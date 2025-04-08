import React from 'react';
import TopCampaigns from '@/components/ui/TopCampaigns';
import dynamic from 'next/dynamic';

const MyCampaigns = dynamic(() => import('@/components/ui/MyCampaigns'), {
  ssr: false,
});

const HomeHeader = dynamic(() => import('@/components/ui/HomeHeader'), {
  ssr: false,
});

const UserHome = () => {
  return (
    <div className="">
      <HomeHeader />
      <MyCampaigns />
      <TopCampaigns />
    </div>
  );
};

export default UserHome;
