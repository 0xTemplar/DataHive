import { ethers } from 'hardhat';
import { CampaignManager, DataHiveToken } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Starting campaign creation script with DataHiveToken...');

  // Read deployed addresses from JSON file
  const deploymentPath = path.resolve(
    __dirname,
    '../ignition/deployments/chain-84532/deployed_addresses.json'
  );
  console.log(`Reading deployment from ${deploymentPath}`);

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found at ${deploymentPath}`);
  }

  const deploymentJson = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  // Extract contract addresses
  const dataHiveTokenAddress = deploymentJson['DataHiveModule#DataHiveToken'];
  const campaignManagerAddress =
    deploymentJson['DataHiveModule#CampaignManager'];

  console.log(`Using DataHiveToken address: ${dataHiveTokenAddress}`);
  console.log(`Using CampaignManager address: ${campaignManagerAddress}`);

  // Get the contracts
  const dataHiveToken = (await ethers.getContractAt(
    'DataHiveToken',
    dataHiveTokenAddress
  )) as DataHiveToken;
  const campaignManager = (await ethers.getContractAt(
    'CampaignManager',
    campaignManagerAddress
  )) as CampaignManager;

  // Get the signer to use for the transaction
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);

  // Check token balances
  const balance = await dataHiveToken.balanceOf(deployer.address);
  console.log(`DataHiveToken balance: ${ethers.formatEther(balance)} DHT`);

  // Prepare campaign parameters
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const oneWeekInSeconds = 7 * 24 * 60 * 60;

  const campaignParams = {
    campaignIdString: 'data-science-002',
    title: 'Data Science Training Dataset Collection',
    description: 'Collection of annotated datasets for machine learning models',
    dataRequirements:
      'CSV or JSON format with labeled features and proper documentation',
    qualityCriteria: [
      'Minimum 1000 records per submission',
      'Clean, deduplicated data',
      'Properly labeled features',
      'Includes documentation on data collection methodology',
    ],
    unitPrice: ethers.parseEther('100'), // 100 DHT tokens per submission
    totalBudget: ethers.parseEther('10000'), // 10,000 DHT tokens total budget
    maxSubmissions: 100, // Maximum 100 submissions
    startTime: currentTimestamp, // Start now
    expiration: currentTimestamp + oneWeekInSeconds, // End in 1 week
    metadataURI: 'ipfs://QmDataScienceCampaignMetadata',
    platformFee: 250, // 2.5% platform fee (250 basis points)
    encryptionPublicKey:
      'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0+aBrj6a2Ri2p0+DYIso3vIlWmtmFS0X1A8CWqdB+SpFwn5X', // Example RSA public key
    rewardThreshold: 75, // Minimum score of 75 to qualify for rewards
  };

  try {
    // Approve the campaign manager to spend tokens
    console.log(
      `Approving ${ethers.formatEther(
        campaignParams.totalBudget
      )} DHT tokens for campaign manager...`
    );
    const approveTx = await dataHiveToken.approve(
      campaignManagerAddress,
      campaignParams.totalBudget
    );
    await approveTx.wait();
    console.log('Token approval successful');

    // Get allowance to verify
    const allowance = await dataHiveToken.allowance(
      deployer.address,
      campaignManagerAddress
    );
    console.log(
      `Campaign manager allowance: ${ethers.formatEther(allowance)} DHT`
    );

    // Create the campaign
    console.log('Creating campaign...');
    const tx = await campaignManager.createCampaign(campaignParams);
    console.log(`Transaction hash: ${tx.hash}`);

    const receipt = await tx.wait();

    // Find the CampaignCreated event
    const event = receipt?.logs
      .map((log) => {
        try {
          return campaignManager.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
        } catch (e) {
          return null;
        }
      })
      .find((parsed) => parsed?.name === 'CampaignCreated');

    if (event && 'args' in event) {
      console.log(
        `Campaign created successfully with ID: ${event.args.campaignId}`
      );
      console.log(`Campaign ID String: ${event.args.campaignIdString}`);
      console.log(
        `Campaign Budget: ${ethers.formatEther(event.args.budget)} DHT`
      );
    } else {
      console.log(
        "Campaign created but couldn't find the CampaignCreated event"
      );
    }

    // Check token balance after campaign creation
    const newBalance = await dataHiveToken.balanceOf(deployer.address);
    console.log(
      `DataHiveToken balance after campaign creation: ${ethers.formatEther(
        newBalance
      )} DHT`
    );
    console.log(
      `Tokens spent: ${ethers.formatEther(balance - newBalance)} DHT`
    );
  } catch (error) {
    console.error('Error creating campaign:', error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
