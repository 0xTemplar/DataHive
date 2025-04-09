import React, { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import Head from 'next/head';

const UserProfile = dynamic(() => import('../container/profile/UserProfile'), {
  ssr: false,
});

const Profile = () => {
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
        <title>DataHive | Profile</title>
        <meta name="description" content="View and manage your DataHive profile" />
      </Head>
      <Layout>
        <div className="ml-[250px]">
          <UserProfile />
        </div>
      </Layout>
    </>
  );
};

export default Profile;
