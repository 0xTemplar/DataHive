import React from 'react';
import {
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import confetti from 'canvas-confetti';

interface SubmissionSuccessProps {
  onClose: () => void;
  onReset: () => void;
  submissionData: {
    name: string;
    file: File | null;
    encryptionStatus: {
      ipfsHash: string;
      transactionHash?: string;
    };
  };
}

const shortenHash = (hash: string, chars = 6) => {
  if (!hash) return '';
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
};

const SubmissionSuccess: React.FC<SubmissionSuccessProps> = ({
  onClose,
  onReset,
  submissionData,
}) => {
  React.useEffect(() => {
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#a855f7', '#22c55e'],
    });
  }, []);

  const handleClose = () => {
    onReset();
    onClose();
  };

  const transactionHash = submissionData.encryptionStatus?.transactionHash;

  return (
    <div className="space-y-8 text-center">
      {/* <div className="relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] opacity-20 animate-pulse" />
        </div>
        <div className="relative mx-auto w-16 h-16 bg-[#22c55e]/10 rounded-full flex items-center justify-center">
          <CheckCircleIcon className="w-10 h-10 text-[#22c55e]" />
        </div>
      </div> */}

      <div>
        <h3 className="text-2xl font-bold text-white mb-2">
          Submission Complete!
        </h3>
        <p className="text-[#f5f5fa7a] text-xs">
          Your data has been successfully submitted to the campaign
        </p>
      </div>

      <div className="bg-[#f5f5fa0a] rounded-xl p-6 max-w-sm mx-auto space-y-4">
        {/* <div>
          <label className="block text-sm text-[#f5f5fa7a] mb-1">
            IPFS Hash
          </label>
          <div className="flex items-center justify-between bg-[#0f0f17] rounded-lg p-3">
            <code className="text-sm text-[#22c55e] font-mono">
              {shortenHash(submissionData.encryptionStatus?.ipfsHash)}
            </code>
            <button
              onClick={() =>
                window.open(
                  `https://gateway.pinata.cloud/ipfs/${submissionData.encryptionStatus?.ipfsHash}`,
                  '_blank'
                )
              }
              className="text-[#f5f5fa7a] hover:text-white transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="w-5 h-5" />
            </button>
          </div>
        </div> */}

        {transactionHash && (
          <div>
            <label className="block text-sm text-[#f5f5fa7a] mb-1">
              Transaction Hash
            </label>
            <div className="flex items-center justify-between bg-[#0f0f17] rounded-lg p-3">
              <code className="text-sm text-[#22c55e] font-mono">
                {shortenHash(transactionHash)}
              </code>
              <button
                onClick={() =>
                  window.open(
                    `https://explorer.movementlabs.xyz/txn/${transactionHash}/events?network=bardock+testnet`,
                    '_blank'
                  )
                }
                className="text-[#f5f5fa7a] hover:text-white transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleClose}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:ring-offset-2 focus:ring-offset-[#0f0f17]"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default SubmissionSuccess;
