import { ethers } from 'hardhat';

async function main() {
  console.log('Starting deployment and campaign creation script...');

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from account: ${deployer.address}`);

  // Step 1: Deploy DataHiveToken
  console.log('\n1. Deploying DataHiveToken...');
  const initialSupply = 10_000_000; // 10 million tokens
  const DataHiveToken = await ethers.getContractFactory('DataHiveToken');
  const token = await DataHiveToken.deploy(initialSupply, deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`DataHiveToken deployed to: ${tokenAddress}`);

  // Step 2: Deploy EscrowManager
  console.log('\n2. Deploying EscrowManager...');
  const EscrowManager = await ethers.getContractFactory('EscrowManager');
  const escrowManager = await EscrowManager.deploy(tokenAddress);
  await escrowManager.waitForDeployment();
  const escrowManagerAddress = await escrowManager.getAddress();
  console.log(`EscrowManager deployed to: ${escrowManagerAddress}`);

  // Step 3: Deploy CampaignManager
  console.log('\n3. Deploying CampaignManager...');
  const CampaignManager = await ethers.getContractFactory('CampaignManager');
  const campaignManager = await CampaignManager.deploy(tokenAddress);
  await campaignManager.waitForDeployment();
  const campaignManagerAddress = await campaignManager.getAddress();
  console.log(`CampaignManager deployed to: ${campaignManagerAddress}`);

  // Step 4: Deploy Reputation
  console.log('\n4. Deploying Reputation...');
  const Reputation = await ethers.getContractFactory('Reputation');
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log(`Reputation deployed to: ${reputationAddress}`);

  // Step 5: Deploy ContributionManager
  console.log('\n5. Deploying ContributionManager...');
  const ContributionManager = await ethers.getContractFactory(
    'ContributionManager'
  );
  const contributionManager = await ContributionManager.deploy(
    campaignManagerAddress,
    escrowManagerAddress
  );
  await contributionManager.waitForDeployment();
  const contributionManagerAddress = await contributionManager.getAddress();
  console.log(`ContributionManager deployed to: ${contributionManagerAddress}`);

  // Step 6: Set up connections between contracts
  console.log('\n6. Setting up contract connections...');

  // Connect CampaignManager to EscrowManager
  await campaignManager.setEscrowContract(escrowManagerAddress);
  console.log('CampaignManager connected to EscrowManager');

  // Connect CampaignManager to ContributionManager
  await campaignManager.setContributionsContract(contributionManagerAddress);
  console.log('CampaignManager connected to ContributionManager');

  // Connect EscrowManager to CampaignManager
  await escrowManager.setCampaignManager(campaignManagerAddress);
  console.log('EscrowManager connected to CampaignManager');

  // Connect EscrowManager to ContributionManager
  await escrowManager.setContributionManager(contributionManagerAddress);
  console.log('EscrowManager connected to ContributionManager');

  // Connect ContributionManager to Reputation
  await contributionManager.setReputationContract(reputationAddress);
  console.log('ContributionManager connected to Reputation');

  // Step 7: Create a campaign
  console.log('\n7. Creating a campaign...');

  // Check token balance
  const balance = await token.balanceOf(deployer.address);
  console.log(`Token balance: ${ethers.formatEther(balance)}`);

  // Set up campaign parameters
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const oneWeekInSeconds = 7 * 24 * 60 * 60;

  const campaignParams = {
    campaignIdString: 'first-campaign',
    title: 'DataHive Platform Launch Campaign',
    description: 'The first campaign on the DataHive platform',
    dataRequirements: 'High-quality labeled datasets',
    qualityCriteria: ['Proper formatting', 'Clean data', 'Complete labeling'],
    unitPrice: ethers.parseEther('10'),
    totalBudget: ethers.parseEther('1000'),
    maxSubmissions: 100,
    startTime: currentTimestamp,
    expiration: currentTimestamp + oneWeekInSeconds,
    metadataURI: 'ipfs://QmFirstCampaign',
    platformFee: 250,
    encryptionPublicKey: 'example-encryption-key',
    rewardThreshold: 75,
  };

  // Approve token usage
  console.log('Approving tokens...');
  await token.approve(campaignManagerAddress, campaignParams.totalBudget);
  console.log('Tokens approved for campaign creation');

  // Create campaign
  console.log('Creating campaign...');
  const tx = await campaignManager.createCampaign(campaignParams);
  console.log(`Transaction sent: ${tx.hash}`);

  const receipt = await tx.wait();
  if (!receipt) {
    console.log('Failed to get transaction receipt');
  } else {
    // Parse the event to get the campaign ID
    for (const log of receipt.logs) {
      try {
        const parsedLog = campaignManager.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (parsedLog && parsedLog.name === 'CampaignCreated') {
          console.log(
            `Campaign created successfully with ID: ${parsedLog.args.campaignId}`
          );
          console.log(`Campaign title: ${parsedLog.args.title}`);
          console.log(
            `Campaign budget: ${ethers.formatEther(parsedLog.args.budget)} DHT`
          );
          break;
        }
      } catch (e) {
        // Not this event, continue
      }
    }
  }

  console.log('\nDeployment and campaign creation completed successfully!');
  console.log('\nContract Addresses:');
  console.log(`DataHiveToken: ${tokenAddress}`);
  console.log(`EscrowManager: ${escrowManagerAddress}`);
  console.log(`CampaignManager: ${campaignManagerAddress}`);
  console.log(`Reputation: ${reputationAddress}`);
  console.log(`ContributionManager: ${contributionManagerAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
