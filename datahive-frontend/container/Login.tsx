import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import {
  HiOutlineDatabase,
  HiOutlineShieldCheck,
  HiOutlineCurrencyDollar,
  HiArrowRight,
  HiCheckCircle,
} from 'react-icons/hi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const Login = () => {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      setShowSuccess(true);

      const timer = setTimeout(() => {
        router.push('/home');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isConnected, address, router]);

  const handleGoToHome = () => {
    router.push('/home');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen h-screen px-6 relative overflow-hidden">
      {/* Modern Abstract Background */}
      <div className="absolute inset-0 bg-[#0f0f13] z-0"></div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Animated Gradient Orbs */}
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>

        {/* Geometric Elements */}
        <div className="geometric geo-1"></div>
        <div className="geometric geo-2"></div>
        <div className="geometric geo-3"></div>
        <div className="geometric geo-4"></div>

        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 bg-grid opacity-10"></div>
      </div>

      {/* Content */}
      <div
        className="max-w-md w-full text-center space-y-8 relative z-10 my-auto rounded-xl p-6 transform hover:scale-[1.01] transition-all duration-300 animate-float"
        style={{
          background: '#1a1a1f',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
        }}
      >
        {/* Logo and title */}
        <div className="space-y-4 mb-2">
          <div className="inline-block mb-2"></div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 bg-clip-text text-transparent ">
              Welcome to DataHive
            </h1>
            {/* <p className="text-gray-400 text-base">
              The decentralized data collection platform
            </p> */}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 my-6">
          <div className="bg-[#f5f5fa08] border border-[#f5f5fa14] rounded-xl p-3 backdrop-blur-sm transition-all duration-300 hover:border-[#6366f1]/40 hover:bg-[#f5f5fa0f]">
            <div className="w-8 h-8 bg-gradient-to-br from-[#a855f7]/20 to-[#a855f7]/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <HiOutlineDatabase className="w-4 h-4 text-[#6366f1]" />
            </div>
            <p className="text-white text-xs">Contribute Data</p>
          </div>
          <div className="bg-[#f5f5fa08] border border-[#f5f5fa14] rounded-xl p-3 backdrop-blur-sm transition-all duration-300 hover:border-[#6366f1]/40 hover:bg-[#f5f5fa0f]">
            <div className="w-8 h-8 bg-gradient-to-br from-[#6366f1]/20 to-[#a855f7]/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <HiOutlineShieldCheck className="w-4 h-4 text-[#a855f7]" />
            </div>
            <p className="text-white text-xs">Verify Quality</p>
          </div>
          <div className="bg-[#f5f5fa08] border border-[#f5f5fa14] rounded-xl p-3 backdrop-blur-sm transition-all duration-300 hover:border-[#6366f1]/40 hover:bg-[#f5f5fa0f]">
            <div className="w-8 h-8 bg-gradient-to-br from-[#6366f1]/20 to-[#a855f7]/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <HiOutlineCurrencyDollar className="w-4 h-4 text-[#6366f1]" />
            </div>
            <p className="text-white text-xs">Earn Rewards</p>
          </div>
        </div>

        {/* Wallet connection card or Success message */}
        {showSuccess ? (
          <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-green-500/30 rounded-xl p-6 shadow-xl shadow-green-500/5 transform hover:scale-[1.01] transition-all duration-300 animate-float mt-2">
            <div className="flex items-center justify-center mb-4">
              <HiCheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Wallet Connected Successfully!
            </h2>
            <p className="text-gray-400 text-xs mb-4">
              You're now connected to the Hive platform. Redirecting to home...
            </p>
            <button
              onClick={handleGoToHome}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Go to Home <HiArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="bg-[#16161b] backdrop-blur-xl border border-[#a855f7]/50 rounded-xl p-6 shadow-xl shadow-black/20 transform hover:scale-[1.01] transition-all duration-300 animate-float mt-2">
            <div className="mb-5">
              
              <p className="text-gray-400 text-xs">
                You need to connect an EVM compatible wallet to access the
                platform
              </p>
            </div>

            <div className="flex justify-center mt-4">
              <ConnectButton label="Connect Wallet" />
            </div>
          </div>
        )}

        <p className="text-gray-500 text-xs mt-4">
          By connecting your wallet, you agree to our{' '}
          <a href="#" className="text-[#a855f7] hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-[#a855f7] hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>

      {/* CSS for modern abstract animations */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
          }
        }

        @keyframes rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes drift {
          0% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(5%, 5%);
          }
          50% {
            transform: translate(0, 10%);
          }
          75% {
            transform: translate(-5%, 5%);
          }
          100% {
            transform: translate(0, 0);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          animation: pulse 10s ease-in-out infinite,
            drift 30s ease-in-out infinite;
        }

        .orb-1 {
          width: 60vw;
          height: 60vw;
          top: -20%;
          left: -10%;
          background: radial-gradient(
            circle at center,
            rgba(99, 102, 241, 0.3),
            rgba(99, 102, 241, 0.1)
          );
          animation-delay: 0s;
        }

        .orb-2 {
          width: 50vw;
          height: 50vw;
          bottom: -10%;
          right: -10%;
          background: radial-gradient(
            circle at center,
            rgba(168, 85, 247, 0.3),
            rgba(168, 85, 247, 0.1)
          );
          animation-delay: 2s;
        }

        .orb-3 {
          width: 40vw;
          height: 40vw;
          top: 40%;
          left: 30%;
          background: radial-gradient(
            circle at center,
            rgba(59, 130, 246, 0.2),
            rgba(59, 130, 246, 0.05)
          );
          animation-delay: 4s;
        }

        .geometric {
          position: absolute;
          opacity: 0.15;
          animation: rotate 60s linear infinite;
        }

        .geo-1 {
          top: 10%;
          left: 10%;
          width: 20vw;
          height: 20vw;
          border: 1px solid rgba(168, 85, 247, 0.3);
          border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
          animation-duration: 60s;
        }

        .geo-2 {
          bottom: 20%;
          right: 15%;
          width: 15vw;
          height: 15vw;
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 50% 50% 50% 50% / 60% 40% 60% 40%;
          animation-duration: 50s;
          animation-direction: reverse;
        }

        .geo-3 {
          top: 40%;
          right: 25%;
          width: 10vw;
          height: 10vw;
          border: 1px solid rgba(168, 85, 247, 0.2);
          transform: rotate(45deg);
          animation-duration: 40s;
        }

        .geo-4 {
          bottom: 30%;
          left: 20%;
          width: 12vw;
          height: 12vw;
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 30% 70% 50% 50% / 40% 60% 40% 60%;
          animation-duration: 70s;
        }

        .bg-grid {
          background-image: linear-gradient(
              rgba(255, 255, 255, 0.05) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.05) 1px,
              transparent 1px
            );
          background-size: 40px 40px;
        }
      `}</style>
    </div>
  );
};

export default Login;
