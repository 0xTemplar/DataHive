import { ethers } from 'hardhat';
import { CampaignManager, IERC20 } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Starting campaign creation script...');

  // Load deployed addresses from the JSON file
  const deploymentPath = path.join(
    __dirname,
    '../ignition/deployments/chain-84532/deployed_addresses.json'
  );
  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  // Get the CampaignManager contract address from the deployment file
  const campaignManagerAddress =
    deployedAddresses['DataHiveModule#CampaignManager'];
  if (!campaignManagerAddress) {
    throw new Error('CampaignManager address not found in deployment file');
  }

  console.log(`Using CampaignManager at address: ${campaignManagerAddress}`);
  const campaignManager = (await ethers.getContractAt(
    'CampaignManager',
    campaignManagerAddress
  )) as CampaignManager;

  // Get the signer to use for the transaction
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);

  // Prepare campaign parameters
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const oneWeekInSeconds = 7 * 24 * 60 * 60;

  const campaignParams = {
    campaignIdString: 'campaign-001',
    title: 'Sample Image Collection Campaign',
    description:
      'A sample campaign to collect high-quality images for AI training',
    dataRequirements: 'High resolution images of natural landscapes',
    qualityCriteria: [
      'Minimum 1080p resolution',
      'Good lighting',
      'No watermarks',
    ],
    unitPrice: ethers.parseEther('0.01'), // 0.01 ETH per submission
    totalBudget: ethers.parseEther('1'), // 1 ETH total budget
    maxSubmissions: 100, // Maximum 100 submissions
    startTime: currentTimestamp, // Start now
    expiration: currentTimestamp + oneWeekInSeconds, // End in 1 week
    metadataURI: 'ipfs://QmSampleMetadataUri', // Sample metadata URI
    platformFee: 250, // 2.5% platform fee (250 basis points)
    encryptionPublicKey: 'sample-encryption-key-for-testing-purposes-only', // Sample public key
    rewardThreshold: 80, // Minimum score of 80 to qualify for rewards
  };

  try {
    // Get the reward token address from the campaign manager
    const rewardTokenAddress = await campaignManager.rewardToken();
    console.log(`Reward token address: ${rewardTokenAddress}`);

    // Get the reward token contract
    const rewardToken = (await ethers.getContractAt(
      'IERC20',
      rewardTokenAddress
    )) as IERC20;

    // Approve the campaign manager to spend the tokens
    console.log(
      `Approving ${ethers.formatEther(
        campaignParams.totalBudget
      )} tokens for campaign manager...`
    );
    const approveTx = await rewardToken.approve(
      campaignManagerAddress,
      campaignParams.totalBudget
    );
    await approveTx.wait();
    console.log('Token approval successful');

    console.log('Creating campaign...');

    // Create the campaign (without value parameter since we're using token)
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
    } else {
      console.log(
        "Campaign created but couldn't find the CampaignCreated event"
      );
    }
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
