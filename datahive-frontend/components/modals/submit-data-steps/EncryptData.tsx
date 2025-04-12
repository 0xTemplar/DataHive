import React, { useEffect, useState, useCallback } from 'react';
import {
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { submitContributionOnChain } from '@/utils/contract-functions/submitContribution';
import { useAccount } from 'wagmi';
import axios from 'axios';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import crypto from 'crypto';
import useCampaignStore from '@/helpers/store/useCampaignStore';
import { createWalletClient, custom } from 'viem';
import { baseSepolia } from 'viem/chains';

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

// Add window.ethereum type
declare global {
  interface Window {
    ethereum?: any;
  }
}

const uploadSteps = [
  { id: 1, name: 'Preparing Data' },
  { id: 2, name: 'Uploading to Storage Bucket' },
];

// EC2 server endpoint
const storageServerEndpoint = process.env.NEXT_PUBLIC_STORAGE_SERVER_ENDPOINT;
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
  const { campaign } = useCampaignStore();

  const generateContributionId = (): string => {
    return `contribution_${Date.now()}_${crypto
      .randomBytes(4)
      .toString('hex')}`;
  };

  const handleOnChainSubmission = async () => {
    if (
      !address ||
      !submissionData.aiVerificationResult ||
      !submissionData.encryptionStatus?.fileUrl
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
          `/api/campaign/get_user_reputation?address=${address}`
        );

        if (reputationResponse.data && reputationResponse.data.reputation) {
          reputationScore =
            parseInt(reputationResponse.data.reputation.reputation_score) || 1;
          console.log('Fetched reputation score:', reputationScore);
        }
      } catch (reputationError) {
        console.warn('Failed to fetch reputation score:', reputationError);
      }

      const contributionId = generateContributionId();

      const dataReference = submissionData.encryptionStatus.rootCID;
      console.log(
        'Using data reference for on-chain submission:',
        dataReference
      );

      if (!window.ethereum) {
        throw new Error(
          'Ethereum provider not found. Please install a wallet.'
        );
      }

      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(window.ethereum),
      });

      const result = await submitContributionOnChain({
        campaignId: campaignId as string,
        dataUrl: submissionData.encryptionStatus.fileUrl,
        rootCID: dataReference,
        score: submissionData.aiVerificationResult.score,
        contributorAddress: address as `0x${string}`,
        walletClient: walletClient,
      });

      console.log('Result:', result);

      if (!result.success) {
        throw new Error(
          result.error || 'Failed to submit contribution on-chain'
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const backendPayload = {
          onchain_contribution_id: contributionId,
          campaign_id: campaignId,
          contributor: address,
          data_url: dataReference, // Use RootCID if available
          transaction_hash: result.txHash,
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

  const uploadFile = useCallback(async () => {
    if (!submissionData.file || isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      setCurrentStep(1);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const bucketName = campaign?.bucket_name || 'fake_news_detection';

      if (!bucketName) {
        throw new Error('Bucket name not found in campaign data');
      }

      setCurrentStep(2);

      // Create a unique file name with timestamp to prevent collisions
      const timestamp = Date.now();
      const fileExtension = submissionData.file.name.split('.').pop();
      const uniqueFileName = `${submissionData.name.replace(
        /\s+/g,
        '_'
      )}_${timestamp}.${fileExtension}`;

      const fileToUpload = new File([submissionData.file], uniqueFileName, {
        type: submissionData.file.type,
      });

      const formData = new FormData();
      formData.append('file', fileToUpload);

      console.log('Uploading file:', uniqueFileName);
      console.log('To bucket:', bucketName);

      try {
        await axios.get(`${storageServerEndpoint}/buckets/${bucketName}`);
      } catch (bucketError) {
        console.log('Bucket might not exist, trying to create it');
        try {
          await axios.post(`${storageServerEndpoint}/buckets`, { bucketName });
          console.log('Bucket created successfully');
        } catch (createBucketError) {
          console.warn(
            'Could not create bucket, might already exist:',
            createBucketError
          );
        }
      }

      let uploadResponse;
      try {
        uploadResponse = await axios.post(
          `${storageServerEndpoint}/buckets/${bucketName}/files`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 30000, // 30 seconds timeout
          }
        );
        console.log('Upload response:', uploadResponse.data);
      } catch (uploadErr) {
        console.error('Upload error details:', uploadErr);

        if (uploadErr.response?.data?.error?.includes('FileFullyUploaded')) {
          console.log(
            'File was already uploaded or has a duplicate name, using the filename we attempted to upload'
          );
          uploadResponse = {
            data: {
              success: true,
              file_name: uniqueFileName,
            },
          };
        } else {
          throw uploadErr;
        }
      }

      if (
        !uploadResponse?.data?.file_name &&
        !uploadResponse?.data?.success &&
        !uploadResponse?.data?.data
      ) {
        throw new Error(
          'Failed to upload file to storage bucket: No file_name or data returned'
        );
      }

      let uploadedFileName = uniqueFileName;
      let rootCID = '';

      if (uploadResponse.data.file_name) {
        uploadedFileName = uploadResponse.data.file_name;
      } else if (uploadResponse.data.data && uploadResponse.data.data.Name) {
        uploadedFileName = uploadResponse.data.data.Name;
      }

      if (uploadResponse.data.data && uploadResponse.data.data.RootCID) {
        rootCID = uploadResponse.data.data.RootCID;
        console.log('File RootCID:', rootCID);
      }

      const fileUrl = `${storageServerEndpoint}/buckets/${bucketName}/files/${uploadedFileName}`;

      console.log('File uploaded successfully:', fileUrl);

      setIsComplete(true);
      updateSubmissionData({
        encryptionStatus: {
          status: 'success',
          fileUrl: fileUrl,
          fileName: uploadedFileName,
          bucketName: bucketName,
          rootCID: rootCID,
        },
      });
    } catch (err) {
      console.error('Upload error:', err);
      let errorMessage = err instanceof Error ? err.message : 'Upload failed';

      if (err.response?.data?.error) {
        errorMessage = `Upload failed: ${err.response.data.error}`;
      }

      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [
    submissionData.file,
    submissionData.name,
    isProcessing,
    campaign,
    updateSubmissionData,
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
      uploadFile();
    }

    return () => {
      mounted = false;
    };
  }, [submissionData.file, uploadFile, isComplete, error, isProcessing]);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-[#f5f5faf4] mb-2">
            Upload Failed
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
            <CloudArrowUpIcon className="w-24 h-24 text-[#a855f7] animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-[#f5f5faf4] mb-2">
              Uploading Your Data
            </h3>
            <p className="text-[#f5f5fa7a]">
              Uploading your data securely to Akave
            </p>
          </div>

          {/* Steps Progress */}
          <div className="max-w-sm mx-auto space-y-3">
            {uploadSteps.map((step) => (
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
              Upload Complete
            </h3>
            <p className="text-[#f5f5fa7a] mb-6">
              Your data has been successfully uploaded to Akave
            </p>
            <div className="flex flex-col gap-4">
              <div className="bg-[#f5f5fa0a] rounded-xl p-4">
                <p className="text-sm text-[#f5f5fa7a] mb-2">File Location</p>
                <p className="font-mono text-sm text-[#f5f5faf4]">
                  {submissionData.encryptionStatus?.fileName} in bucket{' '}
                  {submissionData.encryptionStatus?.bucketName}
                </p>
                {submissionData.encryptionStatus?.rootCID && (
                  <div className="mt-2">
                    <p className="text-sm text-[#f5f5fa7a] mb-1">Root CID</p>
                    <p className="font-mono text-sm text-[#f5f5faf4] break-all">
                      {submissionData.encryptionStatus?.rootCID}
                    </p>
                  </div>
                )}
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
