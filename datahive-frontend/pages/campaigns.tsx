import React, { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import ActiveCampaigns from '@/container/campaigns/ActiveCampaigns';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import Head from 'next/head';

const Campaigns = () => {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected) {
      router.push('/login');
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return null;
  }

  return (
    <>
      <Head>
        <title>DataHive | Campaigns</title>
        <meta
          name="description"
          content="Browse active data collection campaigns on DataHive"
        />
      </Head>
      <Layout>
        <div className="ml-[250px]">
          <ActiveCampaigns />
        </div>
      </Layout>
    </>
  );
};

export default Campaigns;
