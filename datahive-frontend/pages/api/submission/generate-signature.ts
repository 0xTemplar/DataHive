import { NextApiRequest, NextApiResponse } from 'next';
import { AptosAccount, HexString, BCS } from 'aptos';
import crypto from 'crypto';

const PASS_MARK = 80;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { campaignId, dataUrl, score } = req.body;

  if (!campaignId || !dataUrl || typeof score !== 'number') {
    return res.status(400).json({
      message:
        'Missing required parameters. Need campaignId, dataUrl, and Ai verification score',
    });
  }

  if (score < PASS_MARK) {
    return res.status(400).json({
      message: 'Score does not meet minimum threshold',
      details: {
        score,
        requiredScore: PASS_MARK,
      },
    });
  }

  try {
    if (!process.env.VERIFIER_PRIVATE_KEY) {
      throw new Error(
        'Verifier private key not found in environment variables'
      );
    }

    const verifierAccount = new AptosAccount(
      HexString.ensure(process.env.VERIFIER_PRIVATE_KEY).toUint8Array()
    );

    // Calculate data hash (using SHA-256 of the data URL)
    const dataHash = Array.from(
      crypto.createHash('sha256').update(dataUrl).digest()
    );

    // Create BCS serializer for quality score
    const serializer = new BCS.Serializer();
    serializer.serializeU64(score);
    const bcsQualityScore = serializer.getBytes();

    // Create message to sign (concatenate all required fields)
    const messageToSign = Buffer.concat([
      Buffer.from(campaignId, 'utf8'), // campaign_id
      Buffer.from(dataHash), // data_hash
      Buffer.from(dataUrl, 'utf8'), // data_url
      bcsQualityScore, // BCS encoded quality_score
    ]);

    // Hash the message with SHA-256 before signing
    const messageHash = crypto
      .createHash('sha2-256')
      .update(messageToSign)
      .digest();

    // Sign the hashed message with verifier's key
    const signature = verifierAccount.signBuffer(messageHash);

    // Return both the signature and verifier's address
    return res.status(200).json({
      signature: Array.from(signature.toUint8Array()),
      verifierAddress: verifierAccount.address().hex(),
      qualityScore: score,
      debug: {
        dataHash,
        messageToSign: Array.from(messageToSign),
        messageHash: Array.from(messageHash),
        publicKey: Array.from(verifierAccount.pubKey().toUint8Array()),
      },
    });
  } catch (error: any) {
    console.error('Error generating signature:', error);
    return res.status(500).json({
      message: 'Error generating signature',
      error: error.message,
    });
  }
}
