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
import { createCampaign } from '@/utils/entry-functions/create-campaign';
import { generateCampaignKeys } from '@/utils/crypto/generateCampaignKeys';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const config = new AptosConfig({
  network: Network.TESTNET,
  fullnode: 'https://aptos.testnet.bardock.movementlabs.xyz/v1',
  faucet: 'https://faucet.testnet.bardock.movementnetwork.xyz/',
});

const pinataEndpoint = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

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

  const { address, signAndSubmitTransaction } = useAccount();
  const { validateStep, campaignData } = useCampaign();
  const aptos = new Aptos(config);

  const handleCreateCampaign = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsCreating(true);

    try {
      const { publicKey, privateKey } = await generateCampaignKeys();
      setCampaignPrivateKey(privateKey);

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
      };

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

      const payload = createCampaign({
        campaignId: `campaign_${Date.now()}`,
        title: campaignData.details.title,
        description: campaignData.details.description,
        dataRequirements: campaignData.details.requirements,
        qualityCriteria: campaignData.details.qualityCriteria,
        unitPrice: Number(campaignData.rewards.unitPrice),
        totalBudget: Number(campaignData.rewards.totalBudget),
        minDataCount: Number(campaignData.rewards.minDataCount),
        maxDataCount: Number(campaignData.rewards.maxDataCount),
        expirationDate: new Date(campaignData.details.expirationDate),
        metadataUri,
        encryptionPubKey: publicKey,
      });

      console.log('Transaction payload:', payload.data);

      let response;
      try {
        response = await signAndSubmitTransaction({
          sender: address,
          data: payload.data,
          options: {
            maxGasAmount: 200000,
            gasUnitPrice: 1000,
          },
        });

        const result = await aptos.waitForTransaction({
          transactionHash: response.hash,
        });

        console.log('Transaction confirmed:', result);

        if (result.success) {
          setTxHash(response.hash);

          try {
            const backendPayload = {
              onchain_campaign_id: payload.data.functionArguments[0], // campaignId
              title: payload.data.functionArguments[1], // title
              description: payload.data.functionArguments[2], // description
              data_requirements: payload.data.functionArguments[3], // dataRequirements
              quality_criteria: payload.data.functionArguments[4], // qualityCriteria
              unit_price: Number(payload.data.functionArguments[5]), // unitPrice
              campaign_type: campaignData.type?.name || 'default',
              total_budget: Number(payload.data.functionArguments[6]), // totalBudget
              min_data_count: Number(payload.data.functionArguments[7]), // minDataCount
              max_data_count: Number(payload.data.functionArguments[8]), // maxDataCount
              expiration: Number(payload.data.functionArguments[9]), // expirationDate in seconds
              metadata_uri: payload.data.functionArguments[10], // metadataUri
              transaction_hash: response.hash,
              platform_fee: Number(payload.data.functionArguments[11]), // PLATFORM_FEE_BASIS_POINTS
              creator_wallet_address: address,
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

          localStorage.setItem(
            `campaign_${response.hash}_private_key`,
            privateKey
          );

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
