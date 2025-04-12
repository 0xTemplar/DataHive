import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  HiX,
  HiDownload,
  HiCheck,
  HiExclamation,
  HiFolder,
  HiRefresh,
  HiLockClosed,
  HiKey,
} from 'react-icons/hi';
import { toast } from 'react-toastify';
import JSZip from 'jszip';
import axios from 'axios';
import crypto from 'crypto';
import { useRouter } from 'next/router';

interface Contribution {
  dataUrl: string;
  creator: {
    name: string;
  };
}

interface BulkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contributions: Contribution[];
  bucketName?: string;
  campaignId?: string;
}

interface FileInfo {
  fileName: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
  creatorName?: string;
  data?: ArrayBuffer;
  mimeType?: string;
  size?: string;
  rootCID?: string | null;
  createdAt?: string | null;
}

// EC2 server endpoint
const storageServerEndpoint =
  'http://ec2-44-200-196-16.compute-1.amazonaws.com:8000';
const baseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

const BulkExportModal: React.FC<BulkExportModalProps> = ({
  isOpen,
  onClose,
  contributions,
  bucketName = 'fake_news_detection',
}) => {
  const router = useRouter();
  const { id: campaignId } = router.query;
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // RSA verification states
  const [isVerified, setIsVerified] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [verificationChallenge, setVerificationChallenge] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset states when modal opens
      setIsVerified(false);
      setPrivateKey('');
      setFiles([]);
      setError(null);

      if (campaignId) {
        // Convert campaignId to string if it's an array
        const campaignIdStr = Array.isArray(campaignId)
          ? campaignId[0]
          : String(campaignId);

        fetchPublicKey(campaignIdStr);
      }
    }
  }, [isOpen, campaignId]);

  // Fetch the campaign's public key from the backend or blockchain
  const fetchPublicKey = async (campaignId: string) => {
    try {
      // Fetch the public key from our API route that gets it from the blockchain
      const response = await axios.get(
        `/api/campaign/get_campaign_pubkey?campaignId=${campaignId}`
      );

      if (
        response.data &&
        response.data.success &&
        response.data.data?.publicKey
      ) {
        const pubKey = response.data.data.publicKey;
        setPublicKey(pubKey);

        // Generate a random verification challenge
        const challenge = crypto.randomBytes(16).toString('hex');
        setVerificationChallenge(challenge);

        console.log('Successfully retrieved campaign public key');
      } else {
        console.warn('Public key not found in API response:', response.data);
        setError('Could not retrieve campaign encryption key');
      }
    } catch (err: any) {
      console.error('Error fetching campaign public key:', err);
      setError(
        err.response?.data?.error ||
          'Failed to retrieve campaign encryption key'
      );
    }
  };

  // Verify the private key against the public key
  const verifyPrivateKey = async () => {
    if (!privateKey.trim()) {
      toast.error('Please enter your private key');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      console.log('Attempting to verify private key');

      // Clean up private key - remove extra spaces and normalize format
      let cleanPrivateKey = privateKey.trim();

      // Try different formats if the key doesn't have standard PEM headers
      if (!cleanPrivateKey.includes('BEGIN')) {
        console.log('Key missing BEGIN marker, trying different formats');

        // Try PKCS#1 format first (traditional RSA private key)
        const pkcs1Format = `-----BEGIN RSA PRIVATE KEY-----\n${cleanPrivateKey}\n-----END RSA PRIVATE KEY-----`;

        // Also try PKCS#8 format (more modern, often used in newer systems)
        const pkcs8Format = `-----BEGIN PRIVATE KEY-----\n${cleanPrivateKey}\n-----END PRIVATE KEY-----`;

        // Start with PKCS#1 for backward compatibility
        cleanPrivateKey = pkcs1Format;

        // For debugging:
        console.log('First attempting PKCS#1 format');
      }

      console.log(
        'Public key format check:',
        publicKey.substring(0, 30).includes('BEGIN')
          ? 'Has headers'
          : 'No headers'
      );

      // Create a test verification by signing the challenge with the private key
      const sign = crypto.createSign('SHA256');
      sign.update(verificationChallenge);

      try {
        // Try to sign with the provided private key in PKCS#1 format
        let signature;
        try {
          signature = sign.sign(
            {
              key: cleanPrivateKey,
              padding: crypto.constants.RSA_PKCS1_PADDING,
            },
            'base64'
          );

          console.log('Successfully signed with PKCS#1 format');
        } catch (pkcs1Error) {
          console.log('PKCS#1 format failed, trying PKCS#8 format');

          // If PKCS#1 fails, try PKCS#8
          if (!cleanPrivateKey.includes('BEGIN PRIVATE KEY')) {
            // Only change format if we haven't already tried PKCS#8
            cleanPrivateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey.trim()}\n-----END PRIVATE KEY-----`;
          }

          // Create a new signing object
          const sign2 = crypto.createSign('SHA256');
          sign2.update(verificationChallenge);

          signature = sign2.sign(
            {
              key: cleanPrivateKey,
              padding: crypto.constants.RSA_PKCS1_PADDING,
            },
            'base64'
          );

          console.log('Successfully signed with PKCS#8 format');
        }

        console.log('Generated signature successfully');

        // Verify the signature with the public key
        const verify = crypto.createVerify('SHA256');
        verify.update(verificationChallenge);

        // Prepare public key format - try multiple formats if needed
        let cleanPublicKey = publicKey.trim();
        let isValidSignature = false;

        // Try different public key formats if verification fails
        const publicKeyFormats = [
          // Original format
          cleanPublicKey,

          // With SPKI header (most common)
          `-----BEGIN PUBLIC KEY-----\n${cleanPublicKey.replace(
            /-----(BEGIN|END) PUBLIC KEY-----/g,
            ''
          )}\n-----END PUBLIC KEY-----`,

          // With RSA public key header (less common)
          `-----BEGIN RSA PUBLIC KEY-----\n${cleanPublicKey.replace(
            /-----(BEGIN|END) (RSA )?PUBLIC KEY-----/g,
            ''
          )}\n-----END RSA PUBLIC KEY-----`,
        ];

        // Try each format in sequence
        for (const formatToTry of publicKeyFormats) {
          try {
            isValidSignature = verify.verify(
              {
                key: formatToTry,
                padding: crypto.constants.RSA_PKCS1_PADDING,
              },
              signature,
              'base64'
            );

            if (isValidSignature) {
              console.log(
                'Verification successful with format:',
                formatToTry.substring(0, 30) + '...'
              );
              break;
            }
          } catch (formatError) {
            console.log('Format verification failed, trying next format');
          }
        }

        console.log('Final verification result:', isValidSignature);

        if (isValidSignature) {
          setIsVerified(true);
          toast.success('Key verified successfully');
          loadBucketFiles();
        } else {
          toast.error('Invalid private key');
          setError(
            "The provided private key does not match this campaign's public key"
          );
        }
      } catch (signError: any) {
        console.error('Key signing error:', signError);

        // Provide more specific error messages
        if (signError.message?.includes('bad decrypt')) {
          toast.error('Invalid private key format or encrypted key');
          setError(
            'The key appears to be encrypted or in an invalid format. Please provide a valid RSA private key without password protection.'
          );
        } else if (signError.message?.includes('no start line')) {
          toast.error('Invalid key format');
          setError(
            'The private key is not properly formatted. It should be in PEM format or a base64-encoded key.'
          );
        } else {
          toast.error('Invalid key format or mismatched key pair');
          setError(
            `The provided key appears to be invalid: ${signError.message}`
          );
        }
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      toast.error('Verification failed');
      setError(`Failed to verify your key: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const loadBucketFiles = async () => {
    // Only allow loading files if verified or in development mode
    if (!isVerified && process.env.NODE_ENV !== 'development') {
      setError('Please verify your private key first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setFiles([]);

    try {
      // Get list of files in the bucket
      const response = await axios.get(
        `${storageServerEndpoint}/buckets/${bucketName}/files`
      );

      // Check if response exists and has expected format
      if (!response.data) {
        throw new Error('Empty response received from server');
      }

      let fileList: FileInfo[] = [];

      // Handle success property with data array (API format from example)
      if (response.data.success && Array.isArray(response.data.data)) {
        fileList = response.data.data.map((file: any) => ({
          fileName: file.Name || file.name || 'unknown',
          status: 'success' as const,
          size: file.EncodedSize
            ? formatFileSize(parseInt(file.EncodedSize))
            : 'Unknown size',
          rootCID: file.RootCID || null,
          createdAt: file.CreatedAt || null,
        }));
      }
      // Handle array format (direct files array)
      else if (Array.isArray(response.data)) {
        fileList = response.data.map((file: any) => ({
          fileName: file.Name || file.name || 'unknown',
          status: 'success' as const,
          size:
            file.Size || file.EncodedSize
              ? formatFileSize(parseInt(file.Size || file.EncodedSize))
              : 'Unknown size',
          rootCID: file.RootCID || null,
        }));
      }
      // Handle object format with files property
      else if (response.data.files && Array.isArray(response.data.files)) {
        fileList = response.data.files.map((file: any) => ({
          fileName: file.Name || file.name || 'unknown',
          status: 'success' as const,
          size:
            file.Size || file.EncodedSize
              ? formatFileSize(parseInt(file.Size || file.EncodedSize))
              : 'Unknown size',
          rootCID: file.RootCID || null,
        }));
      }
      // Empty bucket case
      else if (response.data && Object.keys(response.data).length === 0) {
        toast.info('Bucket is empty');
      } else {
        console.warn('Unexpected response format:', response.data);
        throw new Error('Invalid response format from server');
      }

      setFiles(fileList);

      // If we got here but have no files, it's an empty bucket (not an error)
      if (fileList.length === 0) {
        toast.info('No files found in bucket');
      }
    } catch (err: any) {
      console.error('Error loading bucket files:', err);

      // Handle specific error cases
      if (err.response && err.response.status === 404) {
        setError(`Bucket "${bucketName}" not found`);
      } else if (err.message && err.message.includes('Network Error')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(
          err.response?.data?.error ||
            err.message ||
            'Failed to load files from bucket'
        );
      }

      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    // Only allow downloads if verified or in development mode
    if (!isVerified && process.env.NODE_ENV !== 'development') {
      setError('Please verify your private key first');
      return;
    }

    if (files.length === 0) {
      toast.error('No files available to download');
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      let completedFiles = 0;

      for (const file of files) {
        try {
          // Download file from bucket
          const response = await axios.get(
            `${storageServerEndpoint}/buckets/${bucketName}/files/${file.fileName}/download`,
            { responseType: 'arraybuffer' }
          );

          if (response.data) {
            // Add file to zip
            zip.file(file.fileName, response.data);
            completedFiles++;
            setProgress((completedFiles / files.length) * 100);
          }
        } catch (fileErr) {
          console.error(`Error downloading file ${file.fileName}:`, fileErr);
          // Continue with other files even if one fails
        }
      }

      if (completedFiles === 0) {
        throw new Error('Failed to download any files');
      }

      // Generate zip file
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);

      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bucketName}_export.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${completedFiles} of ${files.length} files`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to download files'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleFileDownload = async (file: FileInfo) => {
    // Only allow downloads if verified or in development mode
    if (!isVerified && process.env.NODE_ENV !== 'development') {
      setError('Please verify your private key first');
      return;
    }

    try {
      // Create download link
      const downloadUrl = `${storageServerEndpoint}/buckets/${bucketName}/files/${file.fileName}/download`;

      // Open download in new tab
      window.open(downloadUrl, '_blank');
    } catch (err) {
      console.error('Download error:', err);
      toast.error(`Failed to download ${file.fileName}`);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={onClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[#0f0f17] p-6 shadow-xl transition-all border border-[#f5f5fa14]">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-[#f5f5fa7a] hover:text-white transition-colors"
              >
                <HiX className="h-6 w-6" />
              </button>

              <Dialog.Title className="text-2xl font-bold text-white mb-2">
                Bulk Export Files
              </Dialog.Title>
              <Dialog.Description className="text-[#f5f5fa7a] text-sm mb-6">
                Download multiple files from the bucket in one operation
              </Dialog.Description>

              <div className="space-y-6">
                {!isVerified ? (
                  // Key Verification Form
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[#f5f5faf4] mb-4">
                      <HiLockClosed className="h-6 w-6 text-[#a855f7]" />
                      <span className="font-medium">Verification Required</span>
                    </div>

                    <p className="text-[#f5f5fa7a] text-sm">
                      Please enter your private RSA key to unlock access to the
                      campaign data. This key was provided to you when the
                      campaign was created.
                    </p>

                    <div className="rounded-xl border border-[#f5f5fa14] bg-[#f5f5fa05] p-4">
                      <label className="block text-xs text-[#f5f5fa7a] mb-2">
                        RSA Private Key
                      </label>
                      <textarea
                        className="w-full p-3 rounded-lg bg-[#0f0f17] border border-[#f5f5fa14] text-[#f5f5faf4] text-sm font-mono h-[120px] focus:border-[#a855f7] focus:outline-none"
                        placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                      />
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-[#f5f5fa7a] text-xs">
                          Your key never leaves your browser and is used only
                          for verification.
                        </p>

                        {/* Key format helper button */}
                        <button
                          type="button"
                          onClick={() => {
                            // Clean up key (strip whitespace and headers)
                            let cleanKey = privateKey.trim();
                            cleanKey = cleanKey
                              .replace(/-----BEGIN.*?-----/, '')
                              .replace(/-----END.*?-----/, '')
                              .replace(/[\r\n\s]/g, '');

                            if (cleanKey.length > 0) {
                              // Add PKCS#1 format headers
                              const formattedKey = `-----BEGIN RSA PRIVATE KEY-----\n${cleanKey}\n-----END RSA PRIVATE KEY-----`;
                              setPrivateKey(formattedKey);
                              toast.info(
                                'Applied RSA PKCS#1 format to your key'
                              );
                            } else {
                              toast.error('Please enter a private key first');
                            }
                          }}
                          className="text-xs px-2 py-1 bg-indigo-600/30 text-indigo-300 rounded hover:bg-indigo-600/50 transition-colors"
                        >
                          Format Key
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                        <HiExclamation className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-red-500 font-medium mb-1">
                            Verification Error
                          </p>
                          <p className="text-red-400 text-sm">{error}</p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={verifyPrivateKey}
                      disabled={isVerifying || !privateKey.trim()}
                      className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:ring-offset-2 focus:ring-offset-[#0f0f17] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isVerifying ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <HiKey className="h-5 w-5" />
                          <span>Verify Key & Access Files</span>
                        </>
                      )}
                    </button>

                    {/* Development mode skip verification button */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mt-4 border-t border-[#f5f5fa14] pt-4">
                        <p className="text-amber-400 text-xs mb-2">
                          Development Mode
                        </p>
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              setIsVerified(true);
                              loadBucketFiles();
                            }}
                            className="w-full px-4 py-2 border border-amber-400 rounded-lg text-amber-400 text-sm hover:bg-amber-400/10 transition-colors"
                          >
                            Skip Verification (Dev Only)
                          </button>

                          {/* Debug public key display */}
                          {publicKey && (
                            <div className="mt-2 p-3 bg-gray-800 rounded-lg">
                              <p className="text-xs text-amber-400 mb-1">
                                Public Key Format:
                              </p>
                              <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap break-all">
                                {publicKey.substring(0, 100)}
                                {publicKey.length > 100 ? '...' : ''}
                              </pre>

                              <div className="flex mt-2 gap-2">
                                <button
                                  onClick={async () => {
                                    if (!privateKey.trim()) {
                                      toast.error('Enter a private key first');
                                      return;
                                    }

                                    try {
                                      const response = await axios.post(
                                        '/api/utils/verify-rsa-keypair',
                                        {
                                          privateKey,
                                          publicKey,
                                        }
                                      );

                                      if (response.data.success) {
                                        if (response.data.valid) {
                                          toast.success(
                                            `Keys form a valid pair! Using format: ${
                                              response.data.key_details
                                                ?.successful_format || 'unknown'
                                            }`
                                          );
                                        } else {
                                          toast.error(
                                            'Keys do NOT form a valid pair'
                                          );
                                        }
                                      } else {
                                        toast.error(
                                          `Verification error: ${
                                            response.data.detail ||
                                            response.data.error
                                          }`
                                        );
                                      }

                                      // Show detailed debug info in console
                                      console.log(
                                        'Key verification details:',
                                        response.data
                                      );
                                    } catch (err) {
                                      toast.error('Error testing key pair');
                                      console.error(
                                        'Key pair test error:',
                                        err
                                      );
                                    }
                                  }}
                                  className="text-xs px-2 py-1 bg-indigo-600 text-white rounded"
                                >
                                  Test Key Pair
                                </button>

                                <button
                                  onClick={() => {
                                    try {
                                      // Convert public key to various formats to help debugging
                                      const baseKey = publicKey
                                        .replace(/-----BEGIN.*?-----/, '')
                                        .replace(/-----END.*?-----/, '')
                                        .replace(/[\r\n\s]/g, '');

                                      const formats = {
                                        'PKCS#1 (Raw RSA)': `-----BEGIN RSA PUBLIC KEY-----\n${baseKey}\n-----END RSA PUBLIC KEY-----`,
                                        'PKCS#8 (SPKI)': `-----BEGIN PUBLIC KEY-----\n${baseKey}\n-----END PUBLIC KEY-----`,
                                        'Raw Base64': baseKey,
                                      };

                                      console.log(
                                        'Public key in different formats:',
                                        formats
                                      );
                                      toast.info(
                                        'Public key formats logged to console'
                                      );
                                    } catch (err) {
                                      console.error(
                                        'Error formatting keys:',
                                        err
                                      );
                                    }
                                  }}
                                  className="text-xs px-2 py-1 bg-gray-600 text-white rounded"
                                >
                                  Debug Key
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // File listing and download (only shown after verification)
                  <>
                    {/* Bucket Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#f5f5faf4]">
                        <HiFolder className="h-5 w-5 text-[#a855f7]" />
                        <span className="font-medium">{bucketName}</span>
                        <span className="text-sm text-[#f5f5fa7a]">
                          ({files.length} files)
                        </span>
                      </div>

                      <button
                        onClick={loadBucketFiles}
                        disabled={isLoading}
                        className="p-2 text-[#f5f5fa7a] hover:text-white transition-colors"
                        title="Refresh file list"
                      >
                        <HiRefresh
                          className={`h-5 w-5 ${
                            isLoading ? 'animate-spin' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                        <HiExclamation className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-red-500 font-medium mb-1">
                            Error loading files
                          </p>
                          <p className="text-red-400 text-sm">{error}</p>
                        </div>
                      </div>
                    )}

                    {/* Loading State */}
                    {isLoading && !progress && (
                      <div className="p-8 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-2 border-t-transparent border-[#a855f7] rounded-full animate-spin mb-4"></div>
                        <p className="text-[#f5f5fa7a]">
                          Loading files from bucket...
                        </p>
                      </div>
                    )}

                    {/* Progress Bar */}
                    {isLoading && progress > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#f5f5fa7a]">
                            Downloading...
                          </span>
                          <span className="text-[#f5f5faf4]">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div className="h-2 bg-[#f5f5fa14] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Files List */}
                    {files.length > 0 ? (
                      <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-[#f5f5fa0a] rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <HiCheck className="w-5 h-5 text-green-400" />
                              <div>
                                <p className="text-sm text-[#f5f5faf4]">
                                  {file.fileName}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-[#f5f5fa7a]">
                                  <span>{file.size}</span>
                                  {file.createdAt && (
                                    <span>
                                      •{' '}
                                      {new Date(
                                        file.createdAt
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                {file.rootCID && (
                                  <p className="text-xs text-[#f5f5fa7a] truncate max-w-[250px]">
                                    CID: {file.rootCID.substring(0, 20)}...
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleSingleFileDownload(file)}
                              className="p-2 text-[#f5f5fa7a] hover:text-white transition-colors"
                            >
                              <HiDownload className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      !isLoading && (
                        <div className="p-6 text-center text-[#f5f5fa7a]">
                          {error
                            ? 'Failed to load files'
                            : 'No files found in bucket'}
                        </div>
                      )
                    )}

                    <div className="flex gap-4">
                      <button
                        onClick={handleDownloadAll}
                        disabled={isLoading || files.length === 0}
                        className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:ring-offset-2 focus:ring-offset-[#0f0f17] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <HiDownload className="h-5 w-5" />
                            <span>Download All ({files.length} files)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BulkExportModal;
