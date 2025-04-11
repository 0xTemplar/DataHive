import { ethers } from 'hardhat';
import { Reputation } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Fetching reputation data for a user address...');

  // Load deployed addresses from the JSON file
  const deploymentPath = path.join(
    __dirname,
    '../ignition/deployments/chain-84532/deployed_addresses.json'
  );

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found at ${deploymentPath}`);
  }

  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  const reputationAddress = deployedAddresses['DataHiveModule#Reputation'];

  if (!reputationAddress) {
    throw new Error('Reputation contract address not found in deployment file');
  }

  console.log(`Using Reputation contract: ${reputationAddress}`);

  const [signer] = await ethers.getSigners();
  console.log(`Connected with account: ${signer.address}`);

  const reputation = (await ethers.getContractAt(
    'Reputation',
    reputationAddress
  )) as Reputation;

  const userAddress = process.argv[2] || signer.address;
  console.log(`Fetching reputation data for address: ${userAddress}`);

  try {
    const hasStore = await reputation.hasReputationStore(userAddress);

    if (!hasStore) {
      console.log(`No reputation data found for address ${userAddress}`);
      return;
    }

    const reputationScore = await reputation.getReputationScore(userAddress);
    const contributionCount = await reputation.getContributionCount(
      userAddress
    );
    const paymentCount = await reputation.getSuccessfulPayments(userAddress);
    const campaignContributionCount =
      await reputation.getCampaignContributionCount(userAddress);

    console.log('\nREPUTATION SUMMARY:');
    console.log('===================');
    console.log(`Address: ${userAddress}`);
    console.log(`Reputation Score: ${reputationScore}`);
    console.log(`Total Contributions Made: ${contributionCount}`);
    console.log(`Successful Payments: ${paymentCount}`);
    console.log(
      `Contributions Received in Campaigns: ${campaignContributionCount}`
    );

    // Get badges
    const badgeIds = await reputation.getBadges(userAddress);
    const userBadgeCount = await reputation.getBadgeCount(userAddress);

    console.log(`\nEARNED BADGES (${userBadgeCount}):`);
    console.log('=================');

    if (badgeIds.length === 0) {
      console.log('No badges earned yet.');
    } else {
      for (let i = 0; i < badgeIds.length; i++) {
        const badgeId = badgeIds[i];
        const badge = await reputation.badges(badgeId);

        console.log(`Badge #${badgeId}: ${badge.name}`);
        console.log(`- Description: ${badge.description}`);
        console.log(`- Requirements:`);
        console.log(`  · Score: ${badge.scoreThreshold}`);
        console.log(`  · Contributions: ${badge.contributionThreshold}`);
        console.log(`  · Payments: ${badge.paymentThreshold}`);
        console.log(
          `  · Campaign Contributions: ${badge.campaignContributionThreshold}`
        );
        console.log('-----------------');
      }
    }

    // Show progress toward next badges
    console.log('\nPROGRESS TOWARD NEXT BADGES:');
    console.log('===========================');

    // Get all badges from the contract to check progress
    let badgeIndex = 0;
    const earnedBadgeSet = new Set(badgeIds.map((id) => Number(id)));
    let nextBadgesFound = false;

    // Loop until we find no more badges
    while (true) {
      try {
        const badge = await reputation.badges(badgeIndex);

        // Skip badges the user already has
        if (!earnedBadgeSet.has(Number(badgeIndex))) {
          const scoreProgress =
            Math.min(
              100,
              Math.floor(
                (Number(reputationScore) / Number(badge.scoreThreshold)) * 100
              )
            ) || 100;
          const contribProgress =
            Math.min(
              100,
              Math.floor(
                (Number(contributionCount) /
                  Number(badge.contributionThreshold)) *
                  100
              )
            ) || 100;
          const paymentProgress =
            Math.min(
              100,
              Math.floor(
                (Number(paymentCount) / Number(badge.paymentThreshold)) * 100
              )
            ) || 100;
          const campaignProgress =
            Math.min(
              100,
              Math.floor(
                (Number(campaignContributionCount) /
                  Number(badge.campaignContributionThreshold)) *
                  100
              )
            ) || 100;

          console.log(`Badge: ${badge.name}`);
          console.log(`- Description: ${badge.description}`);
          console.log(
            `- Score: ${reputationScore}/${badge.scoreThreshold} (${scoreProgress}%)`
          );
          console.log(
            `- Contributions: ${contributionCount}/${badge.contributionThreshold} (${contribProgress}%)`
          );
          console.log(
            `- Payments: ${paymentCount}/${badge.paymentThreshold} (${paymentProgress}%)`
          );
          console.log(
            `- Campaign Contributions: ${campaignContributionCount}/${badge.campaignContributionThreshold} (${campaignProgress}%)`
          );
          console.log('-----------------');

          nextBadgesFound = true;
        }

        badgeIndex++;
      } catch (error) {
        // We've reached the end of the badges array
        break;
      }
    }

    if (!nextBadgesFound) {
      console.log('You have earned all available badges!');
    }
  } catch (error) {
    console.error('Error fetching reputation data:', error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
