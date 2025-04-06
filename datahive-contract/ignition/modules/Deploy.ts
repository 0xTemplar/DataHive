// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

// FilecoinContractsModule manages deployment of all contracts for the data marketplace
const FilecoinContractsModule = buildModule('FilecoinContractsModule', (m) => {
  // Get the reward token address from parameters
  // Default is empty, must be provided during deployment
  const rewardTokenAddress = m.getParameter('rewardTokenAddress', '');

  // 1. Deploy EscrowManager first (depends only on reward token)
  const escrowManager = m.contract('EscrowManager', [rewardTokenAddress]);

  // 2. Deploy CampaignManager (depends on reward token)
  const campaignManager = m.contract('CampaignManager', [rewardTokenAddress]);

  // 3. Deploy Reputation (no dependencies)
  const reputation = m.contract('Reputation', []);

  // 4. Deploy ContributionManager (depends on CampaignManager and EscrowManager)
  const contributionManager = m.contract('ContributionManager', [
    campaignManager,
    escrowManager,
  ]);

  // 5. Setup connections between contracts
  // Connect CampaignManager to EscrowManager
  m.call(campaignManager, 'setEscrowContract', [escrowManager]);

  // Connect CampaignManager to ContributionManager
  m.call(campaignManager, 'setContributionsContract', [contributionManager]);

  // Connect EscrowManager to CampaignManager
  m.call(escrowManager, 'setCampaignManager', [campaignManager]);

  // Connect EscrowManager to ContributionManager
  m.call(escrowManager, 'setContributionManager', [contributionManager]);

  // Connect ContributionManager to Reputation
  m.call(contributionManager, 'setReputationContract', [reputation]);

  return {
    escrowManager,
    campaignManager,
    reputation,
    contributionManager,
  };
});
export default FilecoinContractsModule;
