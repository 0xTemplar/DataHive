// import { ethers } from 'hardhat';
// import {
//   ContributionManager,
//   CampaignManager,
//   DataHiveToken,
// } from '../typechain-types';

// async function main() {
//   console.log('Starting simplified contribution submission script...');

//   // Contract addresses from the deployment
//   const contributionManagerAddress =
//     '0x64362329c60F1C757577188FBE2e824433E5142B';
//   const campaignManagerAddress = '0xf9264627a60c030815C9eBFF29396AE71777de8b';
//   const tokenAddress = '0xDbBCe303B4aAb6E34f04895F9400f7eC7021B311';

//   // Get the signer (contributor)
//   const [contributor] = await ethers.getSigners();
//   console.log(`Contributing from account: ${contributor.address}`);

//   // Get the contracts
//   const contributionManager = (await ethers.getContractAt(
//     'ContributionManager',
//     contributionManagerAddress
//   )) as ContributionManager;

//   const campaignManager = (await ethers.getContractAt(
//     'CampaignManager',
//     campaignManagerAddress
//   )) as CampaignManager;

//   const token = (await ethers.getContractAt(
//     'DataHiveToken',
//     tokenAddress
//   )) as DataHiveToken;

//   // Contribution parameters
//   const campaignId = 0; // This should match campaign-001
//   const timestamp = new Date().getTime();
//   const encryptedDataHash =
//     '0x' + Buffer.from(`simple-data-hash-${timestamp}`).toString('hex');
//   const encryptedAESKey =
//     '0x' + Buffer.from(`simple-aes-key-${timestamp}`).toString('hex');
//   const metadataURI = 'ipfs://QmSimpleMetadata';
//   const score = 85; // Verification score (higher than the reward threshold)

//   try {
//     // First, get campaign details to make sure it exists and is active
//     const campaign = await campaignManager.getCampaignDetails(campaignId);
//     console.log(`Campaign details:`);
//     console.log(`- Campaign ID: ${campaign.id}`);
//     console.log(`- Title: ${campaign.title}`);
//     console.log(`- Creator: ${campaign.creator}`);
//     console.log(
//       `- Reward per submission: ${ethers.formatEther(
//         campaign.unitPrice
//       )} tokens`
//     );
//     console.log(`- Min. Quality Score: ${campaign.rewardThreshold}%`);
//     console.log(`- Active: ${campaign.active}`);

//     // Check if campaign is accepting submissions
//     const isAccepting = await campaignManager.isAcceptingSubmissions(
//       campaignId
//     );
//     console.log(`Campaign is accepting submissions: ${isAccepting}`);

//     if (!isAccepting) {
//       console.log('Cannot submit: Campaign is not accepting submissions');
//       return;
//     }

//     // Check and approve tokens if needed
//     const balance = await token.balanceOf(contributor.address);
//     console.log(`Your token balance: ${ethers.formatEther(balance)} DHT`);

//     const allowance = await token.allowance(
//       contributor.address,
//       contributionManagerAddress
//     );
//     console.log(
//       `Current allowance for ContributionManager: ${ethers.formatEther(
//         allowance
//       )} DHT`
//     );

//     // Approve tokens if needed
//     if (allowance < campaign.unitPrice) {
//       console.log(`Approving tokens for the ContributionManager...`);
//       const approveTx = await token.approve(
//         contributionManagerAddress,
//         campaign.unitPrice
//       );
//       await approveTx.wait();
//       console.log(`Tokens approved successfully`);
//     }

//     // Now submit the contribution
//     console.log(`\nSubmitting contribution to campaign ID ${campaignId}...`);
//     console.log(`Encrypted data hash: ${encryptedDataHash}`);
//     console.log(`Metadata URI: ${metadataURI}`);
//     console.log(`Verification score: ${score}`);

//     // Submit the contribution
//     const tx = await contributionManager
//       .connect(contributor)
//       .submitContribution(
//         campaignId,
//         encryptedDataHash,
//         encryptedAESKey,
//         metadataURI,
//         score
//       );

//     console.log(`Transaction hash: ${tx.hash}`);
//     const receipt = await tx.wait();

//     console.log('Contribution submitted successfully!');

//     // Get contributor's submissions
//     const submissions = await contributionManager.getContributorSubmissions(
//       contributor.address
//     );
//     console.log(`\nTotal submissions by contributor: ${submissions.length}`);
//   } catch (error) {
//     console.error('Error submitting contribution:', error);
//     console.error('Full error:', error);
//   }
// }

// // Execute the script
// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
