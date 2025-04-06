import { ethers } from 'hardhat';
import { Contract } from 'ethers';

async function main() {
  console.log('Deploying DataHiveToken...');

  // Get the account to deploy from
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from account: ${deployer.address}`);

  // Initial token supply: 10 million tokens (10% of max supply)
  const initialSupply = 10_000_000;

  // Deploy the token contract
  const DataHiveTokenFactory = await ethers.getContractFactory('DataHiveToken');
  const token = await DataHiveTokenFactory.deploy(
    initialSupply,
    deployer.address
  );

  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log(`DataHiveToken deployed to: ${tokenAddress}`);
  console.log(`Initial supply: ${initialSupply} DHT tokens`);
  console.log(`Token owner: ${deployer.address}`);

  // Get the contract instance with the ABI that includes the ERC20 functions
  const tokenContract = new Contract(
    tokenAddress,
    [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function totalSupply() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)',
    ],
    deployer
  );

  // Display token details
  const name = await tokenContract.name();
  const symbol = await tokenContract.symbol();
  const totalSupply = await tokenContract.totalSupply();
  const deployerBalance = await tokenContract.balanceOf(deployer.address);

  console.log(`Token name: ${name}`);
  console.log(`Token symbol: ${symbol}`);
  console.log(`Total supply: ${ethers.formatEther(totalSupply)} DHT`);
  console.log(`Deployer balance: ${ethers.formatEther(deployerBalance)} DHT`);

  console.log('\nToken successfully deployed and configured!');
  console.log('Use this token address when deploying the platform contracts.');
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
