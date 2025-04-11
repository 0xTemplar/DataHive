import { ethers } from 'hardhat';
import { Reputation } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

interface UserReputation {
  address: string;
  score: number;
  contributionCount: number;
  badgeCount: number;
}

async function main() {
  console.log('Generating reputation leaderboard...');

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

  // Optional: user address to highlight in the leaderboard
  // Default to the signer's address if no argument provided
  const targetUserAddress = process.argv[2] || signer.address;

  try {
    // Get recent events - we can parse these to find users with reputation stores
    // Note: This is a simplified approach and might not catch all users if the event logs are pruned
    // A more comprehensive approach would require indexing events or keeping a separate database
    const filter = reputation.filters.ReputationChanged();
    const events = await reputation.queryFilter(filter, -10000); // Try to get last 10000 blocks

    // Extract unique user addresses
    const userAddresses = Array.from(
      new Set(events.map((event) => event.args[0]))
    );

    console.log(`Found ${userAddresses.length} users with reputation data`);

    if (userAddresses.length === 0) {
      console.log(
        'No reputation data found. The system might be new or events not available.'
      );
      return;
    }

    // Collect reputation data for all users
    const leaderboard: UserReputation[] = [];

    for (const address of userAddresses) {
      // Skip if no reputation store (this shouldn't happen given how we found the addresses)
      const hasStore = await reputation.hasReputationStore(address);
      if (!hasStore) continue;

      // Get user's reputation data
      const score = await reputation.getReputationScore(address);
      const contributionCount = await reputation.getContributionCount(address);
      const badgeCount = await reputation.getBadgeCount(address);

      leaderboard.push({
        address,
        score: Number(score),
        contributionCount: Number(contributionCount),
        badgeCount: Number(badgeCount),
      });
    }

    // Sort leaderboard by score (highest first)
    leaderboard.sort((a, b) => b.score - a.score);

    // Display leaderboard
    console.log('\nREPUTATION LEADERBOARD:');
    console.log('======================');
    console.log(
      'Rank | Address                                    | Score | Contributions | Badges'
    );
    console.log(
      '--------------------------------------------------------------------------------'
    );

    // Track if target user was found
    let targetUserFound = false;
    let targetUserRank = 0;

    leaderboard.forEach((user, index) => {
      const rank = index + 1;
      const isTargetUser =
        user.address.toLowerCase() === targetUserAddress.toLowerCase();

      if (isTargetUser) {
        targetUserFound = true;
        targetUserRank = rank;
      }

      // Format the output, highlighting the target user
      const formattedLine = `${rank.toString().padEnd(4)} | ${
        user.address
      } | ${user.score.toString().padEnd(5)} | ${user.contributionCount
        .toString()
        .padEnd(13)} | ${user.badgeCount}`;

      if (isTargetUser) {
        console.log('\x1b[32m%s\x1b[0m', formattedLine + ' ← YOU');
      } else {
        console.log(formattedLine);
      }
    });

    // If target user was not found in leaderboard
    if (!targetUserFound) {
      const hasStore = await reputation.hasReputationStore(targetUserAddress);

      if (hasStore) {
        // User has reputation store but was not in recent events
        const score = await reputation.getReputationScore(targetUserAddress);
        const contributionCount = await reputation.getContributionCount(
          targetUserAddress
        );
        const badgeCount = await reputation.getBadgeCount(targetUserAddress);

        console.log('\nYOUR REPUTATION:');
        console.log('================');
        console.log(`Address: ${targetUserAddress}`);
        console.log(`Score: ${score}`);
        console.log(`Contributions: ${contributionCount}`);
        console.log(`Badges: ${badgeCount}`);
        console.log(
          '(Your data is not in the leaderboard because it may be new or not in recent events)'
        );
      } else {
        console.log(
          `\nNo reputation data found for address ${targetUserAddress}`
        );
      }
    } else {
      // Show percentile and summary for target user
      const percentile =
        ((leaderboard.length - targetUserRank) / leaderboard.length) * 100;

      console.log('\nYOUR RANKING:');
      console.log('=============');
      console.log(`Rank: ${targetUserRank} out of ${leaderboard.length} users`);
      console.log(`Percentile: ${percentile.toFixed(1)}%`);
      console.log(
        `You are in the top ${(100 - percentile).toFixed(
          1
        )}% of users by reputation score!`
      );
    }
  } catch (error) {
    console.error('Error generating reputation leaderboard:', error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
