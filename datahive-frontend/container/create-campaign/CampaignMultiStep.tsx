import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import ProgressBar from '@/components/ui/ProgressBar';
import CampaignType from '@/components/ui/multistep-components/CampaignType';
import CampaignDetails from '@/components/ui/multistep-components/CampaignDetails';
import CampaignRewards from '@/components/ui/multistep-components/CampaignRewards';
import CampaignReview from '@/components/ui/multistep-components/CampaignReview';
import CampaignSuccess from '@/components/ui/multistep-components/CampaignSuccess';
import { CampaignProvider, useCampaign } from '@/context/CampaignContext';
import { generateCampaignKeys } from '@/utils/crypto/generateCampaignKeys';
import {
  createPublicClient,
  http,
  parseAbi,
  createWalletClient,
  formatEther,
  parseEther,
  getContract,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import CampaignManagerABI from '@/abi/CampaignManager.json';
import DataHiveTokenABI from '@/abi/DataHiveToken.json';
import { custom } from 'viem';
import crypto from 'crypto';

// Add window.ethereum type declaration
declare global {
  interface Window {
    ethereum?: any;
  }
}

const pinataEndpoint = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

// Contract addresses - should be moved to environment variables
const campaignManagerAddress =
  process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS || '0x...';
const dataHiveTokenAddress =
  process.env.NEXT_PUBLIC_DATA_HIVE_TOKEN_ADDRESS || '0x...';

// Create viem clients
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const steps = [
  { label: 'Campaign Type', description: '' },
  { label: 'Campaign Details', description: '' },
  { label: 'Campaign Rewards', description: '' },
  { label: 'Review', description: '' },
  { label: 'Launch', description: '' },
];

const CampaignStepContent = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [campaignPrivateKey, setCampaignPrivateKey] = useState<string | null>(
    null
  );

  const { address } = useAccount();
  const { validateStep, campaignData } = useCampaign();

  const handleCreateCampaign = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsCreating(true);

    try {
      const { publicKey, privateKey } = await generateCampaignKeys();
      setCampaignPrivateKey(privateKey);

      const uniqueIdData = `${Date.now()}_${address}_${
        campaignData.details.title
      }`;
      const campaignIdHash = crypto
        .createHash('sha256')
        .update(uniqueIdData)
        .digest('hex')
        .substring(0, 16);
      const uniqueCampaignId = `campaign_${campaignIdHash}`;

      console.log('Generated unique campaign ID:', uniqueCampaignId);

      // Create campaign metadata
      const metadata = {
        type: campaignData.type?.name,
        title: campaignData.details.title,
        description: campaignData.details.description,
        requirements: campaignData.details.requirements,
        qualityCriteria: campaignData.details.qualityCriteria,
        rewards: {
          unitPrice: campaignData.rewards.unitPrice,
          totalBudget: campaignData.rewards.totalBudget,
          minDataCount: campaignData.rewards.minDataCount,
          maxDataCount: campaignData.rewards.maxDataCount,
        },
        expirationDate: campaignData.details.expirationDate,
        campaignId: uniqueCampaignId, // Include the campaign ID in metadata
      };

      // Upload metadata to IPFS
      const formData = new FormData();
      const jsonBlob = new Blob([JSON.stringify(metadata)], {
        type: 'application/json',
      });
      formData.append('file', jsonBlob);

      const metadataPinataResponse = await axios.post(
        pinataEndpoint,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY!,
            pinata_secret_api_key:
              process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY!,
          },
        }
      );

      if (!metadataPinataResponse.data.IpfsHash) {
        throw new Error('Failed to upload metadata to IPFS');
      }

      const metadataUri = `https://gateway.pinata.cloud/ipfs/${metadataPinataResponse.data.IpfsHash}`;

      // Create wallet client for transactions using window.ethereum
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(window.ethereum),
      });

      // Calculate current timestamp and expiration time (1 week from now)
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const oneWeekInSeconds = 7 * 24 * 60 * 60;
      const expirationTimestamp = Math.floor(
        new Date(campaignData.details.expirationDate).getTime() / 1000
      );

      const campaignParams = {
        campaignIdString: uniqueCampaignId,
        title: campaignData.details.title,
        description: campaignData.details.description,
        dataRequirements: campaignData.details.requirements,
        qualityCriteria: campaignData.details.qualityCriteria,
        unitPrice: parseEther(campaignData.rewards.unitPrice.toString()),
        totalBudget: parseEther(campaignData.rewards.totalBudget.toString()),
        maxSubmissions: BigInt(campaignData.rewards.maxDataCount),
        startTime: BigInt(currentTimestamp),
        expiration: BigInt(expirationTimestamp),
        metadataURI: metadataUri,
        platformFee: BigInt(250), // Default 2.5% platform fee (250 basis points)
        encryptionPublicKey: publicKey,
        rewardThreshold: BigInt(75), // Default minimum score of 75 to qualify for rewards
      };

      console.log('Campaign params:', campaignParams);

      try {
        console.log(`Approving tokens for campaign manager...`);

        const approveTx = await walletClient.writeContract({
          address: dataHiveTokenAddress as `0x${string}`,
          abi: DataHiveTokenABI,
          functionName: 'approve',
          args: [
            campaignManagerAddress as `0x${string}`,
            campaignParams.totalBudget,
          ],
          account: address as `0x${string}`,
          chain: baseSepolia,
        });

        console.log('Token approval transaction hash:', approveTx);

        const approvalReceipt = await publicClient.waitForTransactionReceipt({
          hash: approveTx,
        });

        console.log('Token approval confirmed:', approvalReceipt);

        // Ensure qualityCriteria is passed as an array
        // Convert to array if it's not already
        const qualityCriteriaArray = Array.isArray(
          campaignParams.qualityCriteria
        )
          ? campaignParams.qualityCriteria
          : campaignData.details.qualityCriteria
              .split('\n')
              .filter((line) => line.trim() !== '');

        console.log(
          'Creating campaign with quality criteria:',
          qualityCriteriaArray
        );

        // Restructure the campaign parameters for the contract call
        const contractParams = {
          campaignIdString: campaignParams.campaignIdString,
          title: campaignParams.title,
          description: campaignParams.description,
          dataRequirements: campaignParams.dataRequirements,
          qualityCriteria: qualityCriteriaArray,
          unitPrice: campaignParams.unitPrice,
          totalBudget: campaignParams.totalBudget,
          maxSubmissions: campaignParams.maxSubmissions,
          startTime: campaignParams.startTime,
          expiration: campaignParams.expiration,
          metadataURI: campaignParams.metadataURI,
          platformFee: campaignParams.platformFee,
          encryptionPublicKey: campaignParams.encryptionPublicKey,
          rewardThreshold: campaignParams.rewardThreshold,
        };

        console.log('Creating campaign with contract params:', contractParams);

        console.log('Creating campaign...');
        const tx = await walletClient.writeContract({
          address: campaignManagerAddress as `0x${string}`,
          abi: CampaignManagerABI,
          functionName: 'createCampaign',
          args: [contractParams],
          account: address as `0x${string}`,
          chain: baseSepolia,
        });

        console.log(`Transaction hash: ${tx}`);
        setTxHash(tx);

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: tx,
        });

        console.log('Transaction confirmed:', receipt);

        if (receipt.status === 'success') {
          console.log(
            'Campaign created successfully with transaction hash:',
            tx
          );

          try {
            // Save to backend
            const backendPayload = {
              onchain_campaign_id: uniqueCampaignId,
              title: contractParams.title,
              description: contractParams.description,
              data_requirements: contractParams.dataRequirements,
              quality_criteria: Array.isArray(contractParams.qualityCriteria)
                ? contractParams.qualityCriteria.join('|||')
                : contractParams.qualityCriteria,
              unit_price: Number(formatEther(contractParams.unitPrice)),
              campaign_type: campaignData.type?.name || 'default',
              total_budget: Number(formatEther(contractParams.totalBudget)),
              min_data_count: Number(campaignData.rewards.minDataCount),
              max_data_count: Number(contractParams.maxSubmissions),
              expiration: Number(contractParams.expiration),
              metadata_uri: contractParams.metadataURI,
              transaction_hash: tx,
              platform_fee: Number(contractParams.platformFee),
              creator_wallet_address: address,
              is_csv_only_campaign:
                campaignData.rewards.isCsvOnlyCampaign === true ? true : false,
            };

            const backendResponse = await axios.post(
              `${backendBaseUrl}/campaigns/create-campaigns`,
              backendPayload,
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );

            console.log('Backend response:', backendResponse.data);
          } catch (backendError: any) {
            console.error('Error saving to backend:', backendError);
            toast.warning(
              'Campaign created on-chain but failed to save to backend',
              {
                autoClose: 7000,
              }
            );
          }

          toast.success('Campaign Created Successfully', {
            type: 'success',
            isLoading: false,
            autoClose: 7000,
          });

          localStorage.setItem(`campaign_${tx}_private_key`, privateKey);

          setCurrentStep(steps.length - 1);
        } else {
          throw new Error('Transaction failed');
        }
      } catch (signError: any) {
        console.error('Error during transaction:', signError);
        throw new Error(`Transaction failed: ${signError.message}`);
      }
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(`Failed to create campaign: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      if (currentStep === steps.length - 2) {
        // If we're on the Review step, create the campaign
        await handleCreateCampaign();
      } else {
        setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="max-w-[898px] 2xl:max-w-[1100px] p-6">
      {/* Progress Bar Container */}
      <div className="flex justify-center">
        <ProgressBar
          steps={steps}
          currentStep={
            currentStep === steps.length - 1 && txHash
              ? steps.length - 1
              : currentStep
          }
        />
      </div>

      {/* Step Content Container */}
      <div className="mt-8 flex justify-center">
        <div className="w-full max-w-3xl">
          {currentStep === 0 && <CampaignType />}
          {currentStep === 1 && <CampaignDetails />}
          {currentStep === 2 && <CampaignRewards />}
          {currentStep === 3 && <CampaignReview />}
          {currentStep === 4 && txHash && campaignPrivateKey && (
            <CampaignSuccess
              txHash={txHash}
              campaignPrivateKey={campaignPrivateKey}
            />
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      {currentStep !== steps.length - 1 && (
        <div className="mt-8 flex justify-center">
          <div className="w-full max-w-3xl flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0 || isCreating}
              className="px-6 py-3 text-sm text-[#f5f5faf4] border border-[#f5f5fa14] rounded-xl 
              disabled:opacity-50 hover:bg-[#f5f5fa08] transition-colors"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={isCreating}
              className="px-6 py-3 text-sm text-white bg-gradient-to-r from-[#6366f1] to-[#a855f7] 
              rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {isCreating
                ? 'Creating...'
                : currentStep === steps.length - 2
                ? 'Launch Campaign'
                : 'Next'}
            </button>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
};

const CampaignMultiStep = () => {
  return (
    <CampaignProvider>
      <CampaignStepContent />
    </CampaignProvider>
  );
};

export default CampaignMultiStep;
