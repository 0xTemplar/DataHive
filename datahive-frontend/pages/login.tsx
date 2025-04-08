import React, { useEffect } from 'react';
import LoginComponent from '@/container/Login';
import Head from 'next/head';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';

const Login = () => {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      router.push('/home');
    }
  }, [isConnected, router]);

  return (
    <>
      <Head>
        <title>DataHive | Login</title>
        <meta
          name="description"
          content="Connect your wallet to access the DataHive platform"
        />
      </Head>
      <LoginComponent />
    </>
  );
};

export default Login;
