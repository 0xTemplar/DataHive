import { ethers } from 'hardhat';
import { DataHiveToken } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Starting token minting script...');

  // Load deployed addresses from the JSON file
  const deploymentPath = path.join(
    __dirname,
    '../ignition/deployments/chain-84532/deployed_addresses.json'
  );
  const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  // Get the DataHiveToken contract address from the deployment file
  const dataHiveTokenAddress =
    deployedAddresses['DataHiveModule#dataHiveToken'];
  if (!dataHiveTokenAddress) {
    throw new Error('DataHiveToken address not found in deployment file');
  }

  console.log(`Using DataHiveToken at address: ${dataHiveTokenAddress}`);
  const dataHiveToken = (await ethers.getContractAt(
    'DataHiveToken',
    dataHiveTokenAddress
  )) as DataHiveToken;

  // Get the signer to use for the transaction
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);

  // Address to receive the minted tokens
  // Replace this with the actual recipient address
  const recipientAddress = process.env.RECIPIENT_ADDRESS || deployer.address;
  
  // Amount to mint (100 tokens with 18 decimals)
  const mintAmount = ethers.parseEther('100');

  try {
    console.log(`Minting ${ethers.formatEther(mintAmount)} DHT tokens to ${recipientAddress}...`);
    
    // Call the mint function (requires owner privileges)
    const tx = await dataHiveToken.mint(recipientAddress, mintAmount);
    
    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    
    // Find the Minted event
    const event = receipt?.logs
      .map((log) => {
        try {
          return dataHiveToken.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
        } catch (e) {
          return null;
        }
      })
      .find((parsed) => parsed?.name === 'Minted');

    if (event && 'args' in event) {
      console.log(`Successfully minted ${ethers.formatEther(event.args.amount)} DHT tokens to ${event.args.to}`);
    } else {
      console.log("Tokens minted but couldn't find the Minted event");
    }
    
    // Display the new balance
    const balance = await dataHiveToken.balanceOf(recipientAddress);
    console.log(`New balance of ${recipientAddress}: ${ethers.formatEther(balance)} DHT`);
    
  } catch (error) {
    console.error('Error minting tokens:', error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 