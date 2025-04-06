import { ethers } from 'hardhat';
import { CampaignManager } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  // Get arguments from command line
  const args = process.argv.slice(2);
  const campaignId = args[0] ? parseInt(args[0]) : 0; // Default to campaign ID 0 if not provided

  console.log(`Reading details for campaign ID: ${campaignId}`);

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

  try {
    // Get campaign details
    const campaign = await campaignManager.getCampaignDetails(campaignId);

    // Format the details for better readability
    const details = {
      id: campaign.id.toString(),
      campaignIdString: campaign.campaignIdString,
      creator: campaign.creator,
      title: campaign.title,
      description: campaign.description,
      dataRequirements: campaign.dataRequirements,
      qualityCriteria: campaign.qualityCriteria,
      unitPrice: ethers.formatEther(campaign.unitPrice),
      totalBudget: ethers.formatEther(campaign.totalBudget),
      remainingBudget: ethers.formatEther(campaign.remainingBudget),
      maxSubmissions: campaign.maxSubmissions.toString(),
      currentSubmissions: campaign.currentSubmissions.toString(),
      startTime: new Date(Number(campaign.startTime) * 1000).toLocaleString(),
      expiration: new Date(Number(campaign.expiration) * 1000).toLocaleString(),
      active: campaign.active,
      platformFee: `${Number(campaign.platformFee.toString()) / 100}%`,
      rewardThreshold: `${campaign.rewardThreshold.toString()}%`,
    };

    console.log('Campaign Details:');
    console.log(JSON.stringify(details, null, 2));

    // Get additional campaign status
    const status = await campaignManager.getCampaignStatus(campaignId);
    console.log('\nCampaign Status:');
    console.log(`Active: ${status[0]}`);
    console.log(`Total Contributions: ${status[1].toString()}`);
    console.log(`Remaining Slots: ${status[2].toString()}`);

    // Check if campaign is accepting submissions
    const isAccepting = await campaignManager.isAcceptingSubmissions(
      campaignId
    );
    console.log(`\nAccepting Submissions: ${isAccepting}`);
  } catch (error) {
    console.error('Error retrieving campaign details:', error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
