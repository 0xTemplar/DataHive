import { ethers } from 'hardhat';
import { Reputation } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

interface BadgeInfo {
  id: number;
  name: string;
  description: string;
  requirements: {
    score: number;
    contributions: number;
    payments: number;
    campaignContributions: number;
  };
  progress: {
    score: number;
    contributions: number;
    payments: number;
    campaignContributions: number;
  };
  isEarned: boolean;
}

async function main() {
  console.log('Visualizing badge progression...');

  // Load deployed addresses from the JSON file
  const deploymentPath = path.join(
    __dirname,
    '../ignition/deployments/chain-84532/deployed_addresses.json'
  );

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found at ${deploymentPath}`);
  }

  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  // Get contract address from the deployment file
  const reputationAddress = deployedAddresses['DataHiveModule#Reputation'];

  if (!reputationAddress) {
    throw new Error('Reputation contract address not found in deployment file');
  }

  console.log(`Using Reputation contract: ${reputationAddress}`);

  // Get the signer
  const [signer] = await ethers.getSigners();
  console.log(`Connected with account: ${signer.address}`);

  // Get the Reputation contract
  const reputation = (await ethers.getContractAt(
    'Reputation',
    reputationAddress
  )) as Reputation;

  // User address to check - can be provided as a command line argument
  // Default to the signer's address if no argument provided
  const userAddress = process.argv[2] || signer.address;
  console.log(`Fetching badge progression for address: ${userAddress}`);

  try {
    // Check if the address has a reputation store
    const hasStore = await reputation.hasReputationStore(userAddress);

    if (!hasStore) {
      console.log(`No reputation data found for address ${userAddress}`);
      return;
    }

    // Get user's reputation stats
    const reputationScore = await reputation.getReputationScore(userAddress);
    const contributionCount = await reputation.getContributionCount(
      userAddress
    );
    const paymentCount = await reputation.getSuccessfulPayments(userAddress);
    const campaignContributionCount =
      await reputation.getCampaignContributionCount(userAddress);
    const earnedBadges = await reputation.getBadges(userAddress);

    // Create a set of earned badge IDs for easier checking
    const earnedBadgeSet = new Set(earnedBadges.map((id) => Number(id)));

    console.log('\nUSER STATS:');
    console.log('===========');
    console.log(`Reputation Score: ${reputationScore}`);
    console.log(`Contributions Made: ${contributionCount}`);
    console.log(`Successful Payments: ${paymentCount}`);
    console.log(
      `Campaign Contributions Received: ${campaignContributionCount}`
    );
    console.log(`Badges Earned: ${earnedBadges.length}`);

    // Get all available badges and their progress
    const allBadges: BadgeInfo[] = [];
    let badgeCount = 0;

    while (true) {
      try {
        const badge = await reputation.badges(badgeCount);

        const badgeInfo: BadgeInfo = {
          id: badgeCount,
          name: badge.name,
          description: badge.description,
          requirements: {
            score: Number(badge.scoreThreshold),
            contributions: Number(badge.contributionThreshold),
            payments: Number(badge.paymentThreshold),
            campaignContributions: Number(badge.campaignContributionThreshold),
          },
          progress: {
            score:
              Math.min(
                100,
                Math.floor(
                  (Number(reputationScore) / Number(badge.scoreThreshold)) * 100
                )
              ) || 100,
            contributions:
              Math.min(
                100,
                Math.floor(
                  (Number(contributionCount) /
                    Number(badge.contributionThreshold)) *
                    100
                )
              ) || 100,
            payments:
              Math.min(
                100,
                Math.floor(
                  (Number(paymentCount) / Number(badge.paymentThreshold)) * 100
                )
              ) || 100,
            campaignContributions:
              Math.min(
                100,
                Math.floor(
                  (Number(campaignContributionCount) /
                    Number(badge.campaignContributionThreshold)) *
                    100
                )
              ) || 100,
          },
          isEarned: earnedBadgeSet.has(badgeCount),
        };

        allBadges.push(badgeInfo);
        badgeCount++;
      } catch (error) {
        // We've reached the end of the badges array
        break;
      }
    }

    // Sort badges by progress (highest first for earned, then highest for unearned)
    allBadges.sort((a, b) => {
      // First sort by earned status
      if (a.isEarned && !b.isEarned) return -1;
      if (!a.isEarned && b.isEarned) return 1;

      // Then for unearned badges, calculate the minimum progress across all requirements
      if (!a.isEarned && !b.isEarned) {
        const aMinProgress = Math.min(
          a.progress.score,
          a.progress.contributions,
          a.progress.payments,
          a.progress.campaignContributions
        );

        const bMinProgress = Math.min(
          b.progress.score,
          b.progress.contributions,
          b.progress.payments,
          b.progress.campaignContributions
        );

        return bMinProgress - aMinProgress; // Sort by descending progress
      }

      // For earned badges, sort by ID (which typically represents difficulty/progression)
      return a.id - b.id;
    });

    // Display badge progression
    console.log('\nBADGE PROGRESSION:');
    console.log('=================');

    for (const badge of allBadges) {
      // Create a progress bar for visualization
      const createProgressBar = (percent: number) => {
        const filled = Math.floor(percent / 5);
        const empty = 20 - filled;
        return '[' + '█'.repeat(filled) + '·'.repeat(empty) + ']';
      };

      console.log(`\n${badge.isEarned ? '✅' : '⭕'} Badge: ${badge.name}`);
      console.log(`   ${badge.description}`);

      // Only show non-zero requirements
      if (badge.requirements.score > 0) {
        console.log(
          `   Score: ${createProgressBar(
            badge.progress.score
          )} ${reputationScore}/${badge.requirements.score} (${
            badge.progress.score
          }%)`
        );
      }

      if (badge.requirements.contributions > 0) {
        console.log(
          `   Contributions: ${createProgressBar(
            badge.progress.contributions
          )} ${contributionCount}/${badge.requirements.contributions} (${
            badge.progress.contributions
          }%)`
        );
      }

      if (badge.requirements.payments > 0) {
        console.log(
          `   Payments: ${createProgressBar(
            badge.progress.payments
          )} ${paymentCount}/${badge.requirements.payments} (${
            badge.progress.payments
          }%)`
        );
      }

      if (badge.requirements.campaignContributions > 0) {
        console.log(
          `   Campaign Contributions: ${createProgressBar(
            badge.progress.campaignContributions
          )} ${campaignContributionCount}/${
            badge.requirements.campaignContributions
          } (${badge.progress.campaignContributions}%)`
        );
      }
    }

    // Show badge achievement path suggestion
    console.log('\nSUGGESTED BADGE FOCUS:');
    console.log('====================');

    const unearnedBadges = allBadges.filter((badge) => !badge.isEarned);
    if (unearnedBadges.length === 0) {
      console.log('Congratulations! You have earned all available badges.');
    } else {
      // Find badge with highest progress
      const nextBadge = unearnedBadges[0]; // Already sorted by progress

      console.log(`Focus on earning: ${nextBadge.name}`);
      console.log(`Description: ${nextBadge.description}`);
      console.log('Next steps:');

      // Suggest actions based on which requirement has lowest progress
      const lowestProgress = Math.min(
        nextBadge.requirements.score > 0 ? nextBadge.progress.score : 100,
        nextBadge.requirements.contributions > 0
          ? nextBadge.progress.contributions
          : 100,
        nextBadge.requirements.payments > 0 ? nextBadge.progress.payments : 100,
        nextBadge.requirements.campaignContributions > 0
          ? nextBadge.progress.campaignContributions
          : 100
      );

      if (
        nextBadge.requirements.score > 0 &&
        nextBadge.progress.score === lowestProgress
      ) {
        const pointsNeeded =
          nextBadge.requirements.score - Number(reputationScore);
        console.log(`- Earn ${pointsNeeded} more reputation points`);
      }

      if (
        nextBadge.requirements.contributions > 0 &&
        nextBadge.progress.contributions === lowestProgress
      ) {
        const contributionsNeeded =
          nextBadge.requirements.contributions - Number(contributionCount);
        console.log(`- Make ${contributionsNeeded} more data contributions`);
      }

      if (
        nextBadge.requirements.payments > 0 &&
        nextBadge.progress.payments === lowestProgress
      ) {
        const paymentsNeeded =
          nextBadge.requirements.payments - Number(paymentCount);
        console.log(`- Complete ${paymentsNeeded} more successful payments`);
      }

      if (
        nextBadge.requirements.campaignContributions > 0 &&
        nextBadge.progress.campaignContributions === lowestProgress
      ) {
        const campaignContributionsNeeded =
          nextBadge.requirements.campaignContributions -
          Number(campaignContributionCount);
        console.log(
          `- Receive ${campaignContributionsNeeded} more contributions to your campaigns`
        );
        console.log(
          '  (You might need to create more campaigns to attract contributions)'
        );
      }
    }
  } catch (error) {
    console.error('Error visualizing badge progression:', error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
