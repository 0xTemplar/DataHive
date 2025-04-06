// import { ethers } from 'hardhat';
// import {
//   ContributionManager,
//   Reputation,
//   EscrowManager,
// } from '../typechain-types';

// async function main() {
//   console.log('Starting contract setup script...');

//   // Use the addresses from your most recent deployment
//   const contributionManagerAddress =
//     '0x126C2e23f1a5Ba76B6039c5A811b14175d923387';
//   const reputationAddress = '0xf9a347593D08222Cf3C8115ACc525d7888947bF4';
//   const escrowManagerAddress = '0x1A7dD24D0032EA333d6bc4cE3Afe1e4d0dbBe520';
//   const campaignManagerAddress = '0xE46720601265202ed710D7E84E0D24821808aCbe';

//   // Get the signer (should be the contract owner)
//   const [owner] = await ethers.getSigners();
//   console.log(`Setting up contracts as owner: ${owner.address}`);

//   // Get the contracts
//   const contributionManager = (await ethers.getContractAt(
//     'ContributionManager',
//     contributionManagerAddress
//   )) as ContributionManager;

//   const reputation = (await ethers.getContractAt(
//     'Reputation',
//     reputationAddress
//   )) as Reputation;

//   const escrowManager = (await ethers.getContractAt(
//     'EscrowManager',
//     escrowManagerAddress
//   )) as EscrowManager;

//   // Display current owner of contracts
//   console.log('\nChecking current contract owners:');

//   try {
//     const reputationOwner = await reputation.owner();
//     console.log(`Reputation contract owner: ${reputationOwner}`);
//   } catch (error) {
//     console.error('Error getting reputation owner:', error);
//   }

//   try {
//     const contributionOwner = await contributionManager.owner();
//     console.log(`ContributionManager contract owner: ${contributionOwner}`);
//   } catch (error) {
//     console.error('Error getting contribution manager owner:', error);
//   }

//   try {
//     const escrowOwner = await escrowManager.owner();
//     console.log(`EscrowManager contract owner: ${escrowOwner}`);
//   } catch (error) {
//     console.error('Error getting escrow manager owner:', error);
//   }

//   // Set ContributionManager in EscrowManager
//   console.log(
//     `\nSetting ContributionManager (${contributionManagerAddress}) in EscrowManager...`
//   );
//   try {
//     const setContribTx = await escrowManager.setContributionManager(
//       contributionManagerAddress
//     );
//     await setContribTx.wait();
//     console.log(`✅ ContributionManager set successfully in EscrowManager`);
//   } catch (error) {
//     console.error('Error setting ContributionManager in EscrowManager:', error);
//   }

//   // Set EscrowManager in ContributionManager via Reputation
//   console.log(
//     `\nSetting Reputation contract (${reputationAddress}) in ContributionManager...`
//   );
//   try {
//     const setReputationTx = await contributionManager.setReputationContract(
//       reputationAddress
//     );
//     await setReputationTx.wait();
//     console.log(
//       `✅ Reputation contract set successfully in ContributionManager`
//     );
//   } catch (error) {
//     console.error(
//       'Error setting Reputation contract in ContributionManager:',
//       error
//     );
//   }

//   // Transfer ownership of the Reputation contract to the ContributionManager
//   console.log(
//     `\nTransferring Reputation contract ownership to ContributionManager...`
//   );
//   try {
//     const transferOwnershipTx = await reputation.transferOwnership(
//       contributionManagerAddress
//     );
//     await transferOwnershipTx.wait();
//     console.log(
//       `✅ Reputation contract ownership transferred to ContributionManager`
//     );
//   } catch (error) {
//     console.error('Error transferring Reputation ownership:', error);
//   }

//   // Verify final setup
//   console.log('\nVerifying final configuration:');

//   try {
//     const reputationOwner = await reputation.owner();
//     console.log(`Reputation contract owner: ${reputationOwner}`);
//     console.log(
//       `Should match ContributionManager address: ${contributionManagerAddress}`
//     );
//     console.log(
//       `Match: ${
//         reputationOwner.toLowerCase() ===
//         contributionManagerAddress.toLowerCase()
//       }`
//     );
//   } catch (error) {
//     console.error('Error verifying reputation owner:', error);
//   }

//   console.log('\nContract setup completed!');
// }

// // Execute the script
// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
