import React, { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import UserHome from '@/container/home/UserHome';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';

const Home = () => {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected) {
      router.push('/login');
    }
  }, [isConnected, router]);

  return (
    <>
      <Layout>
        <div className={isConnected ? 'ml-[250px]' : ''}>
          {isConnected ? <UserHome /> : null}
        </div>
      </Layout>
    </>
  );
};

export default Home;
