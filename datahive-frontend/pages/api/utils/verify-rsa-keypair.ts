import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

interface ApiResponse {
  success: boolean;
  valid?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  key_details?: {
    private_key_format?: string;
    public_key_format?: string;
    successful_format?: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
  }

  try {
    const { privateKey, publicKey } = req.body;

    if (!privateKey || !publicKey) {
      return res.status(400).json({
        success: false,
        error: 'Both privateKey and publicKey are required',
      });
    }

    // Clean up keys
    let rawPrivateKey = privateKey.trim();
    let rawPublicKey = publicKey.trim();

    // Strip any existing headers to get the raw base64 content
    rawPrivateKey = rawPrivateKey
      .replace(/-----BEGIN.*?-----/, '')
      .replace(/-----END.*?-----/, '')
      .replace(/[\r\n\s]/g, '');

    rawPublicKey = rawPublicKey
      .replace(/-----BEGIN.*?-----/, '')
      .replace(/-----END.*?-----/, '')
      .replace(/[\r\n\s]/g, '');

    // Define key formats to try
    const privateKeyFormats = [
      `-----BEGIN RSA PRIVATE KEY-----\n${rawPrivateKey}\n-----END RSA PRIVATE KEY-----`,
      `-----BEGIN PRIVATE KEY-----\n${rawPrivateKey}\n-----END PRIVATE KEY-----`,
    ];

    const publicKeyFormats = [
      `-----BEGIN PUBLIC KEY-----\n${rawPublicKey}\n-----END PUBLIC KEY-----`,
      `-----BEGIN RSA PUBLIC KEY-----\n${rawPublicKey}\n-----END RSA PUBLIC KEY-----`,
    ];

    // Track the working formats
    let workingPrivateFormat = '';
    let workingPublicFormat = '';
    let validSignature = false;
    let lastError = null;

    // Generate a test message
    const testMessage = 'This is a test message for RSA key verification';

    // Try all combinations of formats
    for (const privateFormat of privateKeyFormats) {
      // Skip to next format if we already found a working one
      if (validSignature) break;

      try {
        // Try to sign with this private key format
        const sign = crypto.createSign('SHA256');
        sign.update(testMessage);
        const signature = sign.sign(
          {
            key: privateFormat,
            padding: crypto.constants.RSA_PKCS1_PADDING,
          },
          'base64'
        );

        // If we got this far, the private key format works for signing
        workingPrivateFormat = privateFormat.split('\n')[0];

        // Now try to verify with each public key format
        for (const publicFormat of publicKeyFormats) {
          try {
            const verify = crypto.createVerify('SHA256');
            verify.update(testMessage);
            const isValid = verify.verify(
              {
                key: publicFormat,
                padding: crypto.constants.RSA_PKCS1_PADDING,
              },
              signature,
              'base64'
            );

            if (isValid) {
              // We found a working pair!
              validSignature = true;
              workingPublicFormat = publicFormat.split('\n')[0];
              break;
            }
          } catch (pubErr) {
            // This public key format didn't work, try the next one
            lastError = pubErr;
          }
        }
      } catch (privErr) {
        // This private key format didn't work, try the next one
        lastError = privErr;
      }
    }

    if (validSignature) {
      return res.status(200).json({
        success: true,
        valid: true,
        message: 'Keys form a valid pair',
        key_details: {
          private_key_format: workingPrivateFormat,
          public_key_format: workingPublicFormat,
          successful_format: `${workingPrivateFormat} with ${workingPublicFormat}`,
        },
      });
    } else {
      return res.status(200).json({
        success: false,
        valid: false,
        message: 'Keys do not form a valid pair',
        detail: lastError
          ? lastError.message
          : 'Unknown error during verification',
        key_details: {
          private_key_format: workingPrivateFormat || 'Unknown/Invalid',
          public_key_format: workingPublicFormat || 'Unknown/Invalid',
        },
      });
    }
  } catch (error: any) {
    console.error('Error in RSA key verification API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error occurred',
    });
  }
}
