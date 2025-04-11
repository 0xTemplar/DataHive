import { ethers } from 'hardhat';
import {
  ContributionManager,
  CampaignManager,
  EscrowManager,
  DataHiveToken,
  Reputation,
} from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Starting contribution submission script...');

  const deploymentPath = path.join(
    __dirname,
    '../ignition/deployments/chain-84532/deployed_addresses.json'
  );
  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  const contributionManagerAddress =
    deployedAddresses['DataHiveModule#ContributionManager'];
  const campaignManagerAddress =
    deployedAddresses['DataHiveModule#CampaignManager'];
  const tokenAddress = deployedAddresses['DataHiveModule#DataHiveToken'];
  const reputationAddress = deployedAddresses['DataHiveModule#Reputation'];

  if (
    !contributionManagerAddress ||
    !campaignManagerAddress ||
    !tokenAddress ||
    !reputationAddress
  ) {
    throw new Error(
      'One or more contract addresses not found in deployment file'
    );
  }

  console.log(`Using ContributionManager: ${contributionManagerAddress}`);
  console.log(`Using CampaignManager: ${campaignManagerAddress}`);
  console.log(`Using DataHiveToken: ${tokenAddress}`);
  console.log(`Using Reputation: ${reputationAddress}`);

  const [contributor] = await ethers.getSigners();
  console.log(`Contributing from account: ${contributor.address}`);

  const contributionManager = (await ethers.getContractAt(
    'ContributionManager',
    contributionManagerAddress
  )) as ContributionManager;

  const campaignManager = (await ethers.getContractAt(
    'CampaignManager',
    campaignManagerAddress
  )) as CampaignManager;

  const token = (await ethers.getContractAt(
    'DataHiveToken',
    tokenAddress
  )) as DataHiveToken;

  const reputation = (await ethers.getContractAt(
    'Reputation',
    reputationAddress
  )) as Reputation;

  try {
    console.log('Checking Reputation contract setup...');

    const reputationOwner = await reputation.owner();
    console.log(`Reputation contract owner: ${reputationOwner}`);

    if (
      reputationOwner.toLowerCase() !== contributionManagerAddress.toLowerCase()
    ) {
      console.log(
        '⚠️ ContributionManager is not the owner of the Reputation contract. Run setupContracts.ts first.'
      );
      return;
    }

    console.log('✅ Reputation contract setup looks correct.');
  } catch (error) {
    console.error('Error checking reputation contract setup:', error);
    console.log('Continuing anyway since the setup might still work...');
  }

  const campaignIdString = 'campaign_286c9ff0c686a014'; // This should match campaign-001
  const timestamp = new Date().getTime();
  const encryptedDataHash =
    '0x' +
    Buffer.from(`sample-encrypted-data-hash-${timestamp}`).toString('hex');
  const encryptedAESKey =
    '0x' + Buffer.from(`sample-encrypted-aes-key-${timestamp}`).toString('hex');
  const metadataURI = 'ipfs://QmSampleContributionMetadata';
  const score = 85; // Verification score (higher than the reward threshold of 80)

  try {
    // Get numeric campaign ID from string ID
    console.log(
      `Getting numeric campaign ID for string ID: ${campaignIdString}`
    );
    const campaignId = await campaignManager.getCampaignIdFromString(
      campaignIdString
    );
    console.log(`Numeric campaign ID: ${campaignId}`);

    const campaign = await campaignManager.getCampaignDetails(campaignId);
    console.log(`Campaign details:`);
    console.log(`- Campaign ID: ${campaign.id}`);
    console.log(`- Title: ${campaign.title}`);
    console.log(`- Creator: ${campaign.creator}`);
    console.log(
      `- Reward per submission: ${ethers.formatEther(
        campaign.unitPrice
      )} tokens`
    );
    console.log(`- Min. Quality Score: ${campaign.rewardThreshold}%`);
    console.log(`- Active: ${campaign.active}`);

    // Check if campaign is accepting submissions
    const isAccepting = await campaignManager.isAcceptingSubmissions(
      campaignId
    );
    console.log(`Campaign is accepting submissions: ${isAccepting}`);

    if (!isAccepting) {
      console.log('Cannot submit: Campaign is not accepting submissions');
      return;
    }

    // Check and approve tokens if needed (the contract may require tokens for submission)
    const balance = await token.balanceOf(contributor.address);
    console.log(`Your token balance: ${ethers.formatEther(balance)} DHT`);

    const allowance = await token.allowance(
      contributor.address,
      contributionManagerAddress
    );
    console.log(
      `Current allowance for ContributionManager: ${ethers.formatEther(
        allowance
      )} DHT`
    );

    // Approve tokens if needed
    if (allowance < campaign.unitPrice) {
      console.log(`Approving tokens for the ContributionManager...`);
      const approveTx = await token.approve(
        contributionManagerAddress,
        campaign.unitPrice
      );
      await approveTx.wait();
      console.log(`Tokens approved successfully`);
    }

    console.log(`\nSubmitting contribution to campaign ID ${campaignId}...`);
    console.log(`Encrypted data hash: ${encryptedDataHash}`);
    console.log(`Metadata URI: ${metadataURI}`);
    console.log(`Verification score: ${score}`);

    const tx = await contributionManager
      .connect(contributor)
      .submitContribution(
        campaignId,
        encryptedDataHash,
        encryptedAESKey,
        metadataURI,
        score
      );

    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();

    const event = receipt?.logs
      .map((log) => {
        try {
          return contributionManager.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
        } catch (e) {
          return null;
        }
      })
      .find((parsed) => parsed?.name === 'ContributionSubmitted');

    if (event && 'args' in event) {
      console.log(
        `Contribution submitted successfully with ID: ${event.args.contributionId}`
      );
      console.log(`Campaign ID: ${event.args.campaignId}`);
      console.log(`Contributor: ${event.args.contributor}`);
      console.log(`Score: ${event.args.score}`);
      console.log(`Qualified for reward: ${event.args.qualified}`);
    } else {
      console.log(
        "Contribution submitted but couldn't find the ContributionSubmitted event"
      );
    }

    // Get contributor's submissions
    const submissions = await contributionManager.getContributorSubmissions(
      contributor.address
    );
    console.log(`\nTotal submissions by contributor: ${submissions.length}`);

    // Get contribution counts
    const contributionCounts =
      await contributionManager.getAddressTotalContributions(
        contributor.address
      );
    console.log(`Total submitted: ${contributionCounts[0]}`);
    console.log(`Total qualified: ${contributionCounts[1]}`);
  } catch (error) {
    console.error('Error submitting contribution:', error);
    console.log('\nPlease check the following possible issues:');
    console.log(
      '1. You may need to approve tokens for the ContributionManager contract'
    );
    console.log('2. The campaign may not be active or accepting submissions');
    console.log(
      '3. You may have already submitted this exact data hash to this campaign'
    );
    console.log('4. There may be network issues with Base Sepolia');
    console.log(
      '5. Reputation contract may not be properly configured - run setupContracts.ts'
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
