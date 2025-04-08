import React, { useEffect, useState, useCallback } from 'react';
import {
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { encryptFile } from '@/utils/crypto/generateCampaignKeys';
import { submitContribution } from '@/utils/entry-functions/submit-contribution';
import { useAccount } from 'wagmi';
import axios from 'axios';
import { useRouter } from 'next/router';
import { HexString } from 'aptos';
import { toast } from 'react-toastify';
import crypto from 'crypto';

interface EncryptDataProps {
  onNext: () => void;
  onBack: () => void;
  submissionData: {
    name: string;
    file: File | null;
    encryptionStatus: any;
    aiVerificationResult?: {
      status: 'success' | 'failed';
      score: number;
    };
  };
  updateSubmissionData: (data: Partial<{ encryptionStatus: any }>) => void;
}

const encryptionSteps = [
  { id: 1, name: 'Preparing Data' },
  { id: 2, name: 'Fetching Public Keys' },
  { id: 3, name: 'Encrypting Content with RSA & AES Encryption' },
  { id: 4, name: 'Uploading to IPFS' },
];

const pinataEndpoint = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const baseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

const EncryptData: React.FC<EncryptDataProps> = ({
  onNext,
  onBack,
  submissionData,
  updateSubmissionData,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { address } = useAccount();

  const generateContributionId = (): string => {
    return `contribution_${Date.now()}_${crypto
      .randomBytes(4)
      .toString('hex')}`;
  };

  const handleOnChainSubmission = async () => {
    if (
      !address ||
      !submissionData.aiVerificationResult ||
      !submissionData.encryptionStatus?.ipfsHash
    ) {
      toast.error('Missing required data for submission');
      return;
    }

    setIsSubmitting(true);
    try {
      const campaignId = router.query.id || router.asPath.split('/').pop();
      if (!campaignId) {
        throw new Error('Campaign ID not found');
      }

      let reputationScore = 1;
      try {
        const reputationResponse = await axios.get(
          `/api/campaign/getUserReputation?address=${address}`
        );

        if (reputationResponse.data && reputationResponse.data.reputation) {
          reputationScore =
            reputationResponse.data.reputation.reputation_score || 1;
          console.log('Fetched reputation score:', reputationScore);
        }
      } catch (reputationError) {
        console.warn('Failed to fetch reputation score:', reputationError);
      }

      const contributionId = generateContributionId();

      const payload = await submitContribution({
        campaignId: campaignId as string,
        dataUrl: submissionData.encryptionStatus.ipfsHash,
        score: submissionData.aiVerificationResult.score,
        contributionId,
      });

      // const response = await signAndSubmitTransaction(payload);
      // console.log('Transaction submitted:', response);

      // updateSubmissionData({
      //   encryptionStatus: {
      //     ...submissionData.encryptionStatus,
      //     ipfsHash: submissionData.encryptionStatus.ipfsHash,
      //     transactionHash: response.hash || response,
      //   },
      // });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const backendPayload = {
          onchain_contribution_id: contributionId,
          campaign_id: campaignId,
          contributor: address,
          data_url: submissionData.encryptionStatus.ipfsHash,
          // transaction_hash: response.hash || response,
          quality_score: submissionData.aiVerificationResult.score,
          ai_verification_score: submissionData.aiVerificationResult.score,
          reputation_score: reputationScore,
        };

        const backendResponse = await axios.post(
          `${baseUrl}/campaigns/submit-contributions`,
          backendPayload
        );

        if (!backendResponse.data) {
          console.warn('Backend submission completed but no data returned');
        }
      } catch (backendError) {
        console.error('Backend submission error:', backendError);

        toast.warn(
          'On-chain submission successful, but failed to sync with backend'
        );
      }

      toast.success('Contribution submitted successfully!');
      onNext();
    } catch (err) {
      console.error('Submission error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to submit contribution'
      );
      setError(
        err instanceof Error ? err.message : 'Failed to submit contribution'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const encryptAndUpload = useCallback(async () => {
    if (!submissionData.file || isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Prepare data
      setCurrentStep(1);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 2: Fetch public key from API
      setCurrentStep(2);
      const campaignId = router.query.id || router.asPath.split('/').pop();
      if (!campaignId) {
        throw new Error('Campaign ID not found');
      }

      console.log('campaignId', campaignId);

      const publicKeyResponse = await axios.get(
        '/api/submission/fetch-public-key',
        {
          params: { campaignId },
        }
      );

      if (!publicKeyResponse.data.publicKey?.hex) {
        throw new Error('Invalid public key format received');
      }

      // Convert hex string to Uint8Array
      const hexString = publicKeyResponse.data.publicKey.hex;
      console.log('Received public key hex:', hexString);
      const campaignPublicKey = HexString.ensure(hexString).toUint8Array();

      // Step 3: Encrypt the file
      setCurrentStep(3);
      const encryptedData = await encryptFile(
        submissionData.file,
        campaignPublicKey
      );

      // Step 4: Upload to IPFS using Pinata
      setCurrentStep(4);

      // Create a Blob from the encrypted data
      const encryptedBlob = new Blob([encryptedData], {
        type: 'application/octet-stream',
      });

      // Create a File object from the Blob
      const encryptedFile = new File(
        [encryptedBlob],
        `${submissionData.name}_encrypted`,
        {
          type: 'application/octet-stream',
        }
      );

      const formData = new FormData();
      formData.append('file', encryptedFile);

      const pinataResponse = await axios.post(pinataEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY!,
          pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY!,
        },
      });

      if (!pinataResponse.data.IpfsHash) {
        throw new Error('Failed to upload to IPFS');
      }

      setIsComplete(true);
      updateSubmissionData({
        encryptionStatus: {
          status: 'success',
          ipfsHash: pinataResponse.data.IpfsHash,
          encryptedData: encryptedData,
        },
      });
    } catch (err) {
      console.error('Encryption error:', err);
      setError(err instanceof Error ? err.message : 'Encryption failed');
    } finally {
      setIsProcessing(false);
    }
  }, [
    submissionData.file,
    submissionData.name,
    updateSubmissionData,
    router.query.id,
    router.asPath,
    isProcessing,
  ]);

  useEffect(() => {
    let mounted = true;

    if (
      mounted &&
      submissionData.file &&
      !isComplete &&
      !error &&
      !isProcessing
    ) {
      encryptAndUpload();
    }

    return () => {
      mounted = false;
    };
  }, [submissionData.file, encryptAndUpload, isComplete, error, isProcessing]);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-[#f5f5faf4] mb-2">
            Encryption Failed
          </h3>
          <p className="text-[#f5f5fa7a]">{error}</p>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-xl border border-[#f5f5fa14] text-[#f5f5faf4] font-semibold hover:bg-[#f5f5fa14] transition-colors focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:ring-offset-2 focus:ring-offset-[#0f0f17]"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isComplete ? (
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-24 h-24">
            <LockClosedIcon className="w-24 h-24 text-[#a855f7] animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-[#f5f5faf4] mb-2">
              Encrypting Your Data
            </h3>
            <p className="text-[#f5f5fa7a]">
              Securing your data before uploading to IPFS
            </p>
          </div>

          {/* Steps Progress */}
          <div className="max-w-sm mx-auto space-y-3">
            {encryptionSteps.map((step) => (
              <div key={step.id} className="flex items-center space-x-3">
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${
                      step.id < currentStep
                        ? 'border-[#22c55e] bg-[#22c55e]'
                        : step.id === currentStep
                        ? 'border-[#a855f7] animate-pulse'
                        : 'border-[#f5f5fa14]'
                    }`}
                >
                  {step.id < currentStep && (
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    step.id <= currentStep
                      ? 'text-[#f5f5faf4]'
                      : 'text-[#f5f5fa7a]'
                  }`}
                >
                  {step.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-[#22c55e]/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircleIcon className="w-10 h-10 text-[#22c55e]" />
            </div>
            <h3 className="text-lg font-medium text-[#f5f5faf4] mb-2">
              Encryption Complete
            </h3>
            <p className="text-[#f5f5fa7a] mb-6">
              Your data has been encrypted and uploaded to IPFS
            </p>
            <div className="flex flex-col gap-4">
              <div className="bg-[#f5f5fa0a] rounded-xl p-4">
                <p className="text-sm text-[#f5f5fa7a] mb-2">IPFS Hash</p>
                <p className="font-mono text-sm text-[#f5f5faf4]">
                  {submissionData.encryptionStatus?.ipfsHash}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOnChainSubmission}
                disabled={isSubmitting}
                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit On-chain'}
              </button>
              <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl border border-[#f5f5fa14] text-[#f5f5faf4] font-semibold hover:bg-[#f5f5fa14] transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EncryptData;
