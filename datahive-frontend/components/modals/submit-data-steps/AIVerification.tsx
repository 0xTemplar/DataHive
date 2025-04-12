import React, { useEffect, useState, useCallback } from 'react';
import {
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import useCampaignStore from '@/helpers/store/useCampaignStore';

interface AIVerificationProps {
  onNext: () => void;
  onBack: () => void;
  submissionData: {
    name: string;
    file: File | null;
    aiVerificationResult: any;
    campaignId?: string;
    walletAddress?: string;
  };
  updateSubmissionData: (data: Partial<{ aiVerificationResult: any }>) => void;
}

interface VerificationCheck {
  name: string;
  status: 'passed' | 'failed' | 'pending';
  message?: string;
}

const PASS_MARK = 80;
const baseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
// const useSimulation = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';
const useSimulation = true;

const AIVerification: React.FC<AIVerificationProps> = ({
  onNext,
  onBack,
  submissionData,
  updateSubmissionData,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [verificationStarted, setVerificationStarted] = useState(false);
  const [checks, setChecks] = useState<VerificationCheck[]>([
    { name: 'Quality Check', status: 'pending' },
  ]);

  const { campaign } = useCampaignStore();

  // Handle progress simulation separately
  useEffect(() => {
    if (!isAnalyzing) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 2 : prev));
    }, 100);

    return () => clearInterval(progressInterval);
  }, [isAnalyzing]);

  const simulateVerification = useCallback(async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 6000));

      const randomScore = Math.floor(Math.random() * 21) + 80;

      const result = {
        verification_score: randomScore,
      };

      console.log('Simulated verification result:', result);

      setIsAnalyzing(false);
      setProgress(100);

      const score = result.verification_score || 0;
      const passed = score >= PASS_MARK;

      updateSubmissionData({
        aiVerificationResult: {
          status: passed ? 'success' : 'failed',
          score: score,
          checks: [
            {
              name: 'Quality Check',
              status: passed ? 'passed' : 'failed',
              message: passed
                ? 'Data meets quality requirements'
                : 'Data quality score is below required threshold',
            },
          ],
        },
      });

      if (!passed) {
        setError(
          `Quality score (${Math.round(
            score
          )}%) is below the required threshold of ${PASS_MARK}%`
        );
      }
    } catch (err) {
      console.error('Simulation error:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
      setIsAnalyzing(false);
      setProgress(0);
      updateSubmissionData({
        aiVerificationResult: {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Verification failed',
        },
      });
    }
  }, [updateSubmissionData]);

  const performRealVerification = useCallback(async () => {
    if (!submissionData.file || !campaign) return;

    try {
      const formData = new FormData();
      formData.append(
        'onchain_campaign_id',
        submissionData.campaignId || campaign.onchain_campaign_id || ''
      );
      formData.append(
        'wallet_address',
        submissionData.walletAddress ||
          '0x810c0ea5b2de31e9d9d34e3041cefd1f198c68551cabe7a9f601d0a49121f823'
      );

      formData.append('file', submissionData.file, submissionData.file.name);

      const endpoint =
        campaign.campaign_type === 'Text'
          ? `${baseUrl}/ai-verification/contributions/verify-text`
          : `${baseUrl}/ai-verification/contributions/verify-image`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,

        headers: {
          // Explicitly adding these headers to match a typical browser request
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response text:', errorText);

        let errorData;
        try {
          // Try to parse as JSON if possible
          errorData = JSON.parse(errorText);
        } catch (e) {
          // If not JSON, use the raw text
          errorData = { message: errorText };
        }

        throw new Error(
          errorData?.message ||
            `Verification failed with status ${response.status}`
        );
      }

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      // Try to parse the response as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Invalid response format');
      }

      console.log('Real verification result:', result);

      setIsAnalyzing(false);
      setProgress(100);

      const score = result.verification_score || 0;
      const passed = score >= PASS_MARK;

      updateSubmissionData({
        aiVerificationResult: {
          status: passed ? 'success' : 'failed',
          score: score,
          checks: [
            {
              name: 'Quality Check',
              status: passed ? 'passed' : 'failed',
              message: passed
                ? 'Data meets quality requirements'
                : 'Data quality score is below required threshold',
            },
          ],
        },
      });

      if (!passed) {
        setError(
          `Quality score (${Math.round(
            score
          )}%) is below the required threshold of ${PASS_MARK}%`
        );
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
      setIsAnalyzing(false);
      setProgress(0);
      updateSubmissionData({
        aiVerificationResult: {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Verification failed',
        },
      });
    }
  }, [
    submissionData.file,
    submissionData.campaignId,
    submissionData.walletAddress,
    updateSubmissionData,
    campaign,
  ]);

  const verifyData = useCallback(async () => {
    if (!submissionData.file || verificationStarted || !campaign) return;

    setVerificationStarted(true);

    if (useSimulation) {
      await simulateVerification();
    } else {
      await performRealVerification();
    }
  }, [
    submissionData.file,
    verificationStarted,
    campaign,
    useSimulation,
    simulateVerification,
    performRealVerification,
  ]);

  useEffect(() => {
    if (submissionData.file && !verificationStarted) {
      verifyData();
    }
  }, [submissionData.file, verifyData, verificationStarted]);

  const handleRetry = () => {
    setError(null);
    setIsAnalyzing(true);
    setProgress(0);
    setVerificationStarted(false); // Reset the verification flag
  };

  if (error) {
    return (
      <div className="relative h-full flex flex-col">
        <div className="flex-1 space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Verification Failed
            </h3>
            <p className="text-[#f5f5fa7a]">{error}</p>
          </div>
        </div>

        <div className="flex justify-between pt-4 pb-[10px]">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-xl border border-[#f5f5fa14] text-[#f5f5faf4] font-semibold hover:bg-[#f5f5fa14] transition-colors focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:ring-offset-2 focus:ring-offset-[#0f0f17]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleRetry}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:ring-offset-2 focus:ring-offset-[#0f0f17]"
          >
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex-1 space-y-6">
        {isAnalyzing ? (
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-24 h-24">
              <SparklesIcon className="w-24 h-24 text-[#a855f7] animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-[#f5f5faf4] mb-2">
                Analyzing Your{' '}
                {campaign?.campaign_type === 'Text' ? 'Data' : 'Image'}
              </h3>
              <p className="text-[#f5f5fa7a]">
                Our AI is verifying the quality and format of your submission
              </p>
            </div>
            <div className="w-full bg-[#f5f5fa14] rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#22c55e]/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircleIcon className="w-10 h-10 text-[#22c55e]" />
              </div>
              <h3 className="text-lg font-medium text-[#f5f5faf4] mb-2">
                Verification Complete
              </h3>
              <p className="text-[#f5f5fa7a]">
                Your {campaign?.campaign_type === 'Text' ? 'data' : 'image'} has
                passed our AI verification checks
              </p>
            </div>

            <div className="bg-[#f5f5fa0a] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[#f5f5faf4]">Quality Score</span>
                <span className="text-lg font-bold text-[#22c55e]">
                  {Math.round(submissionData.aiVerificationResult?.score)}%
                </span>
              </div>
              <div className="space-y-3">
                {submissionData.aiVerificationResult?.checks.map(
                  (
                    check: { name: string; status: string; message?: string },
                    index: number
                  ) => (
                    <div
                      key={index}
                      className="flex flex-col gap-1 py-2 border-t border-[#f5f5fa14]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[#f5f5faf4]">{check.name}</span>
                        <span
                          className={`font-medium ${
                            check.status === 'passed'
                              ? 'text-[#22c55e]'
                              : 'text-red-500'
                          }`}
                        >
                          {check.status}
                        </span>
                      </div>
                      {check.message && (
                        <p className="text-sm text-[#f5f5fa7a]">
                          {check.message}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 pb-[10px]">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-[#f5f5fa14] text-[#f5f5faf4] font-semibold hover:bg-[#f5f5fa14] transition-colors focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:ring-offset-2 focus:ring-offset-[#0f0f17]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={
            isAnalyzing ||
            !submissionData.aiVerificationResult ||
            submissionData.aiVerificationResult.status === 'failed'
          }
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:ring-offset-2 focus:ring-offset-[#0f0f17] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Encryption
        </button>
      </div>
    </div>
  );
};

export default AIVerification;
