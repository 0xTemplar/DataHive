import React, { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import UserLeaderboard from '@/container/leaderboard/UserLeaderboard';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import Head from 'next/head';

const Leaderboard = () => {
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
        <title>DataHive | Leaderboard</title>
        <meta
          name="description"
          content="View top contributors on the DataHive platform"
        />
      </Head>
      <Layout>
        <div className="ml-[250px]">
          <UserLeaderboard />
        </div>
      </Layout>
    </>
  );
};

export default Leaderboard;
