// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

// DataHiveModule manages deployment of all contracts for the data marketplace
const DataHiveModule = buildModule('DataHiveModule', (m) => {
  // Get parameters - can be provided during deployment
  const initialSupply = m.getParameter('initialSupply', 10_000_000);

  // For initialHolder, we need to ensure we're not using the zero address
  // We'll directly use a default deployer address if not provided
  const initialHolder = m.getParameter(
    'initialHolder',
    '0x12adC90E75246d125263231AE2A9C715c458A45C'
  );

  // Deploy the token contract with parameterized initialHolder
  const dataHiveToken = m.contract('DataHiveToken', [
    initialSupply,
    initialHolder,
  ]);

  // 2. Deploy EscrowManager with the token
  const escrowManager = m.contract('EscrowManager', [dataHiveToken]);

  // 3. Deploy CampaignManager with the token
  const campaignManager = m.contract('CampaignManager', [dataHiveToken]);

  // 4. Deploy Reputation (no dependencies)
  const reputation = m.contract('Reputation', []);

  // 5. Deploy ContributionManager (depends on CampaignManager and EscrowManager)
  const contributionManager = m.contract('ContributionManager', [
    campaignManager,
    escrowManager,
  ]);

  // 6. Setup connections between contracts
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

  // CRITICAL: Transfer ownership of Reputation to ContributionManager
  // This allows ContributionManager to call functions with onlyOwner modifier
  m.call(reputation, 'transferOwnership', [contributionManager]);

  return {
    dataHiveToken,
    escrowManager,
    campaignManager,
    reputation,
    contributionManager,
  };
});

export default DataHiveModule;
