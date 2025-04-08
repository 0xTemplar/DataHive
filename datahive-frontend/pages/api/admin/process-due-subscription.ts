import { NextApiRequest, NextApiResponse } from 'next';
import { AptosClient, AptosAccount, HexString, Types } from 'aptos';
import Cors from 'cors';

const cors = Cors({
  methods: ['POST', 'HEAD'],
});

function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

const nodeUrl = process.env.NEXT_PUBLIC_NODE_URL;
const privateKey = process.env.ADMIN_PRIVATE_KEY;
const campaignManagerAddress =
  process.env.NEXT_PUBLIC_CAMPAIGN_MANAGER_ADDRESS;
const API_KEY = process.env.SUBSCRIPTION_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await runMiddleware(req, res, cors);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!nodeUrl || !privateKey || !campaignManagerAddress) {
    return res.status(500).json({
      message: 'Server configuration error',
      details: 'Missing required environment variables',
    });
  }

  const client = new AptosClient(nodeUrl);
  const account = new AptosAccount(HexString.ensure(privateKey).toUint8Array());

  try {
    console.log('Fetching due renewals count...');
    const dueRenewalsCount = await getDueRenewalsCount(client);
    console.log('Due renewals count:', dueRenewalsCount);

    if (dueRenewalsCount === 0) {
      return res
        .status(200)
        .json({ message: 'No subscriptions due for renewal' });
    }

    console.log('Processing due subscription renewals...');
    const txnResult = await processDueRenewals(client, account);

    console.log('Transaction processed successfully');
    res.status(200).json({
      message: `Successfully processed ${dueRenewalsCount} subscription renewals`,
      transactionHash: txnResult.hash,
      renewalsProcessed: dueRenewalsCount,
      explorerUrl: `https://explorer.movementlabs.xyz/txn/${txnResult.hash}`,
    });
  } catch (error) {
    console.error('Error in process:', error);
    if (error.message && error.message.includes('E_NOT_AUTHORIZED')) {
      res.status(403).json({
        message: 'Your account is not authorized to perform this action.',
      });
    } else if (error.message && error.message.includes('E_NO_DUE_RENEWALS')) {
      res.status(200).json({ message: 'No subscriptions due for renewal' });
    } else {
      res.status(500).json({
        message: 'An error occurred during subscription renewal processing',
        error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
    }
  }
}

async function getDueRenewalsCount(client: AptosClient): Promise<number> {
  try {
    const payload = {
      function: `${campaignManagerAddress}::subscription::get_due_renewals_count`,
      type_arguments: [],
      arguments: [],
    };

    const result = await client.view(payload);
    return Number(result[0]);
  } catch (error) {
    console.error('Error getting due renewals count:', error);
    return 0;
  }
}

async function processDueRenewals(client: AptosClient, account: AptosAccount) {
  const payload = {
    function: `${campaignManagerAddress}::subscription::process_due_renewals`,
    type_arguments: ['0x1::aptos_coin::AptosCoin'],
    arguments: [],
  };

  const txnRequest = await client.generateTransaction(
    account.address(),
    payload
  );
  const signedTxn = await client.signTransaction(account, txnRequest);
  const txnResult = await client.submitTransaction(signedTxn);

  console.log('Processing due subscription renewals...');
  console.log('Transaction hash:', txnResult.hash);

  // Add timeout to prevent hanging indefinitely
  const timeoutMs = 60000; // 1 minute timeout
  try {
    await Promise.race([
      client.waitForTransaction(txnResult.hash),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Transaction wait timeout')),
          timeoutMs
        )
      ),
    ]);
  } catch (error) {
    if (error.message === 'Transaction wait timeout') {
      console.warn(
        `Transaction submitted but wait timed out after ${
          timeoutMs / 1000
        }s. Hash: ${txnResult.hash}`
      );
      // We still return the transaction result since it was submitted
    } else {
      throw error;
    }
  }

  return txnResult;
}
