import React, { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import CampaignMultiStep from '@/container/create-campaign/CampaignMultiStep';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import Head from 'next/head';

const CreateCampaign = () => {
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
        <title>DataHive | Create Campaign</title>
        <meta
          name="description"
          content="Create a new data collection campaign on DataHive"
        />
      </Head>
      <Layout>
        <div className="">
          <CampaignMultiStep />
        </div>
      </Layout>
    </>
  );
};

export default CreateCampaign;
