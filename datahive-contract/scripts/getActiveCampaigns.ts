import { ethers } from 'hardhat';
import { CampaignManager } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

function formatCampaignForExport(
  campaign: any,
  campaignId: bigint,
  isAccepting: boolean,
  statusInfo: any
) {
  return {
    id: Number(campaign.id),
    numericId: Number(campaignId),
    campaignIdString: campaign.campaignIdString,
    title: campaign.title,
    creator: campaign.creator,
    description: campaign.description,
    dataRequirements: campaign.dataRequirements,
    qualityCriteria: campaign.qualityCriteria,
    unitPrice: ethers.formatEther(campaign.unitPrice),
    totalBudget: ethers.formatEther(campaign.totalBudget),
    remainingBudget: ethers.formatEther(campaign.remainingBudget),
    maxSubmissions: Number(campaign.maxSubmissions),
    currentSubmissions: Number(campaign.currentSubmissions),
    startTime: Number(campaign.startTime),
    startTimeFormatted: new Date(
      Number(campaign.startTime) * 1000
    ).toISOString(),
    expiration: Number(campaign.expiration),
    expirationFormatted: new Date(
      Number(campaign.expiration) * 1000
    ).toISOString(),
    active: campaign.active,
    metadataURI: campaign.metadataURI,
    platformFee: Number(campaign.platformFee) / 100, // Convert basis points to percentage
    encryptionPublicKey: campaign.encryptionPublicKey,
    rewardThreshold: Number(campaign.rewardThreshold),
    acceptingSubmissions: isAccepting,
    totalContributions: Number(statusInfo[1]),
    remainingSlots: Number(statusInfo[2]),
  };
}

async function main() {
  console.log('Starting script to get all active campaigns...');

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

  // Extract contract address
  const campaignManagerAddress =
    deploymentJson['DataHiveModule#CampaignManager'];

  console.log(`Using CampaignManager address: ${campaignManagerAddress}`);

  // Get the contract
  const campaignManager = (await ethers.getContractAt(
    'CampaignManager',
    campaignManagerAddress
  )) as CampaignManager;

  // Get the signer
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);

  try {
    // Get total campaign counts
    const [totalCampaigns, activeCampaigns] =
      await campaignManager.getCampaignCount();
    console.log(`Total campaigns: ${totalCampaigns}`);
    console.log(`Active campaigns: ${activeCampaigns}`);

    if (activeCampaigns > 0) {
      // Get all active campaign IDs
      console.log('\nFetching active campaign IDs...');
      const activeCampaignIds = await campaignManager.getActiveCampaigns();
      console.log(`Found ${activeCampaignIds.length} active campaigns`);

      // Array to store formatted campaign data for export
      const campaignsForExport: any[] = [];

      // Fetch and display details for each active campaign
      console.log('\n======= ACTIVE CAMPAIGNS =======');
      for (let i = 0; i < activeCampaignIds.length; i++) {
        const campaignId = activeCampaignIds[i];
        const campaign = await campaignManager.getCampaignDetails(campaignId);

        console.log(`\n--- Campaign ${i + 1} ---`);
        console.log(`ID: ${campaign.id}`);
        console.log(`Campaign ID String: ${campaign.campaignIdString}`);
        console.log(`Title: ${campaign.title}`);
        console.log(`Creator: ${campaign.creator}`);
        console.log(`Description: ${campaign.description}`);
        console.log(`Data Requirements: ${campaign.dataRequirements}`);

        console.log('Quality Criteria:');
        for (let j = 0; j < campaign.qualityCriteria.length; j++) {
          console.log(`  - ${campaign.qualityCriteria[j]}`);
        }

        console.log(
          `Unit Price: ${ethers.formatEther(campaign.unitPrice)} tokens`
        );
        console.log(
          `Total Budget: ${ethers.formatEther(campaign.totalBudget)} tokens`
        );
        console.log(
          `Remaining Budget: ${ethers.formatEther(
            campaign.remainingBudget
          )} tokens`
        );
        console.log(`Max Submissions: ${campaign.maxSubmissions}`);
        console.log(`Current Submissions: ${campaign.currentSubmissions}`);

        const startDate = new Date(Number(campaign.startTime) * 1000);
        const expirationDate = new Date(Number(campaign.expiration) * 1000);

        console.log(`Start Time: ${startDate.toLocaleString()}`);
        console.log(`Expiration: ${expirationDate.toLocaleString()}`);
        console.log(`Is Active: ${campaign.active}`);
        console.log(`Metadata URI: ${campaign.metadataURI}`);
        console.log(`Platform Fee: ${Number(campaign.platformFee) / 100}%`);
        console.log(`Reward Threshold: ${Number(campaign.rewardThreshold)}%`);

        // Check if the campaign is accepting submissions
        const isAccepting = await campaignManager.isAcceptingSubmissions(
          campaignId
        );
        console.log(`Currently Accepting Submissions: ${isAccepting}`);

        // Get campaign status
        const statusInfo = await campaignManager.getCampaignStatus(campaignId);
        console.log(`Status: ${statusInfo[0] ? 'Active' : 'Inactive'}`);
        console.log(`Total Contributions: ${statusInfo[1]}`);
        console.log(`Remaining Slots: ${statusInfo[2]}`);

        // Add formatted campaign data to the export array
        campaignsForExport.push(
          formatCampaignForExport(campaign, campaignId, isAccepting, statusInfo)
        );
      }

      // Save campaigns to JSON file
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const outputPath = path.resolve(
        __dirname,
        `../active_campaigns_${timestamp}.json`
      );
      fs.writeFileSync(
        outputPath,
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            totalCampaigns: Number(totalCampaigns),
            activeCampaigns: campaignsForExport.length,
            campaigns: campaignsForExport,
          },
          null,
          2
        )
      );

      console.log(`\nCampaign data saved to: ${outputPath}`);
    } else {
      console.log('\nNo active campaigns found');

      // Save empty campaigns list to JSON file
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const outputPath = path.resolve(
        __dirname,
        `../active_campaigns_${timestamp}.json`
      );
      fs.writeFileSync(
        outputPath,
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            totalCampaigns: Number(totalCampaigns),
            activeCampaigns: 0,
            campaigns: [],
          },
          null,
          2
        )
      );

      console.log(`\nEmpty campaign data saved to: ${outputPath}`);
    }
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
