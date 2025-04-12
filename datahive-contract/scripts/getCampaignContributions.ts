import { ethers } from 'hardhat';
import { ContributionManager, CampaignManager } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Fetching contributions for a campaign...');

  // Load deployed addresses from the JSON file
  const deploymentPath = path.join(
    __dirname,
    '../ignition/deployments/chain-84532/deployed_addresses.json'
  );
  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  // Get contract addresses from the deployment file
  const contributionManagerAddress =
    deployedAddresses['DataHiveModule#ContributionManager'];
  const campaignManagerAddress =
    deployedAddresses['DataHiveModule#CampaignManager'];

  if (!contributionManagerAddress || !campaignManagerAddress) {
    throw new Error(
      'One or more contract addresses not found in deployment file'
    );
  }

  console.log(`Using ContributionManager: ${contributionManagerAddress}`);
  console.log(`Using CampaignManager: ${campaignManagerAddress}`);

  // Get the signer
  const [signer] = await ethers.getSigners();
  console.log(`Connected with account: ${signer.address}`);

  // Get the contracts
  const contributionManager = (await ethers.getContractAt(
    'ContributionManager',
    contributionManagerAddress
  )) as ContributionManager;

  const campaignManager = (await ethers.getContractAt(
    'CampaignManager',
    campaignManagerAddress
  )) as CampaignManager;

  // Campaign ID to fetch contributions for
  const campaignId = 'campaign_262e81b4b7aab613'; // Change this to the campaign ID you want to check

  try {
    // Get campaign details first to show what campaign we're examining
    const campaign = await campaignManager.getCampaignDetailsByString(
      campaignId
    );

    console.log('\nCAMPAIGN DETAILS:');
    console.log('================');
    console.log(`Campaign #${campaign.id}: ${campaign.title}`);
    console.log(`ID String: ${campaign.campaignIdString}`);
    console.log(`Creator: ${campaign.creator}`);
    console.log(`Description: ${campaign.description}`);
    console.log(
      `Reward per submission: ${ethers.formatEther(campaign.unitPrice)} tokens`
    );
    console.log(
      `Progress: ${campaign.currentSubmissions}/${campaign.maxSubmissions} submissions`
    );
    console.log(
      `Budget: ${ethers.formatEther(
        campaign.remainingBudget
      )}/${ethers.formatEther(campaign.totalBudget)} tokens`
    );
    console.log(`Min. Quality Score: ${campaign.rewardThreshold}%`);
    console.log(`Active: ${campaign.active}`);
    console.log('----------------\n');

    // Get all contributions for this campaign
    const numericCampaignId = campaign.id;
    const contributionIds = await contributionManager.getCampaignSubmissions(
      numericCampaignId
    );

    console.log(
      `Found ${contributionIds.length} contributions for this campaign\n`
    );

    if (contributionIds.length === 0) {
      console.log('No contributions found for this campaign.');
      return;
    }

    console.log('CONTRIBUTIONS:');
    console.log('=============');

    // Create summary counters
    let qualifiedCount = 0;
    let avgScore = 0;
    let totalScore = 0;

    // Get details for each contribution
    for (let i = 0; i < contributionIds.length; i++) {
      const contributionId = contributionIds[i];
      const contribution = await contributionManager.getContributionDetails(
        contributionId
      );

      // Format timestamp
      const timestamp = new Date(
        Number(contribution.timestamp) * 1000
      ).toLocaleString();

      // Update counters
      totalScore += Number(contribution.score);
      if (contribution.qualified) {
        qualifiedCount++;
      }

      console.log(`Contribution #${contribution.id}:`);
      console.log(`- Contributor: ${contribution.contributor}`);
      console.log(
        `- Data Hash: ${contribution.encryptedDataHash.slice(0, 20)}...`
      ); // Truncated for readability
      console.log(`- Metadata URI: ${contribution.metadataURI}`);
      console.log(`- Score: ${contribution.score}`);
      console.log(`- Qualified for reward: ${contribution.qualified}`);
      console.log(`- Submitted: ${timestamp}`);
      console.log('----------------');
    }

    // Calculate average score
    avgScore = totalScore / contributionIds.length;

    // Display summary statistics
    console.log('\nSUMMARY STATISTICS:');
    console.log('==================');
    console.log(`Total contributions: ${contributionIds.length}`);
    console.log(
      `Qualified contributions: ${qualifiedCount} (${(
        (qualifiedCount / contributionIds.length) *
        100
      ).toFixed(2)}%)`
    );
    console.log(`Average score: ${avgScore.toFixed(2)}`);
    console.log(`Threshold score: ${campaign.rewardThreshold}`);

    // Get unique contributors count
    const uniqueContributors = new Set();
    for (let i = 0; i < contributionIds.length; i++) {
      const contribution = await contributionManager.getContributionDetails(
        contributionIds[i]
      );
      uniqueContributors.add(contribution.contributor);
    }
    console.log(`Unique contributors: ${uniqueContributors.size}`);
  } catch (error) {
    console.error('Error fetching campaign contributions:', error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
