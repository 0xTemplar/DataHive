import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  HiX,
  HiKey,
  HiDownload,
  HiLockOpen,
  HiCheck,
  HiExclamation,
} from 'react-icons/hi';
import { decryptFile } from '@/utils/crypto/generateCampaignKeys';
import { toast } from 'react-toastify';
import JSZip from 'jszip';

interface Contribution {
  dataUrl: string;
  creator: {
    name: string;
  };
}

interface BulkDecryptModalProps {
  isOpen: boolean;
  onClose: () => void;
  contributions: Contribution[];
}

interface DecryptionResult {
  ipfsHash: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
  creatorName: string;
  data?: ArrayBuffer;
  mimeType?: string;
}

const BulkDecryptModal: React.FC<BulkDecryptModalProps> = ({
  isOpen,
  onClose,
  contributions,
}) => {
  const [privateKey, setPrivateKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<DecryptionResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (contributions.length > 0) {
      setResults(
        contributions.map((c) => ({
          ipfsHash: c.dataUrl,
          status: 'pending',
          creatorName: c.creator.name,
        }))
      );
    }
  }, [contributions]);

  const validatePrivateKey = (key: string): boolean => {
    try {
      if (!key.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
        throw new Error('Invalid private key format');
      }
      const decoded = atob(key);
      if (!decoded) {
        throw new Error('Invalid private key format');
      }
      return true;
    } catch (err) {
      setError(
        'Invalid private key format. Please provide a valid base64 encoded RSA private key.'
      );
      return false;
    }
  };

  const detectMimeType = (buffer: ArrayBuffer): string => {
    const arr = new Uint8Array(buffer).subarray(0, 4);
    const header = Array.from(arr)
      .map((byte) => byte.toString(16))
      .join('')
      .toUpperCase();

    switch (header) {
      case '89504E47':
        return 'image/png';
      case 'FFD8FFE0':
      case 'FFD8FFE1':
      case 'FFD8FFE2':
      case 'FFD8FFE3':
        return 'image/jpeg';
      case '47494638':
        return 'image/gif';
      case '52494646':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  };

  const handleBulkDecrypt = async () => {
    if (!privateKey) {
      toast.error('Please provide your private key');
      return;
    }

    if (!validatePrivateKey(privateKey)) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    const newResults = [...results];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < contributions.length; i++) {
      const contribution = contributions[i];
      try {
        const response = await fetch(
          `https://gateway.pinata.cloud/ipfs/${contribution.dataUrl}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch from IPFS');
        }

        const encryptedData = new Uint8Array(await response.arrayBuffer());
        if (encryptedData.length === 0) {
          throw new Error('Empty data received');
        }

        const decryptedData = await decryptFile(encryptedData, privateKey);
        if (!decryptedData || decryptedData.byteLength === 0) {
          throw new Error('Decryption resulted in empty data');
        }

        const mimeType = detectMimeType(decryptedData);

        newResults[i] = {
          ...newResults[i],
          status: 'success',
          data: decryptedData,
          mimeType,
        };
        successCount++;
      } catch (err) {
        console.error('Decryption error:', err);
        newResults[i] = {
          ...newResults[i],
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to decrypt',
        };
        failureCount++;
      }

      setProgress(((i + 1) / contributions.length) * 100);
      setResults(newResults);
    }

    setIsProcessing(false);
    toast.success(
      `Decryption complete: ${successCount} successful, ${failureCount} failed`
    );
  };

  const handleDownloadAll = async () => {
    const successfulDecryptions = results.filter(
      (r) => r.status === 'success' && r.data
    );

    if (successfulDecryptions.length === 0) {
      toast.error('No successfully decrypted files to download');
      return;
    }

    try {
      const zip = new JSZip();

      successfulDecryptions.forEach((result) => {
        if (result.data) {
          const extension = result.mimeType?.split('/')[1] || 'bin';
          const fileName = `${result.creatorName.replace(
            /[^a-z0-9]/gi,
            '_'
          )}_${result.ipfsHash.slice(0, 6)}.${extension}`;
          zip.file(fileName, result.data);
        }
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'decrypted_submissions.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('All files downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download files');
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
                Bulk Decrypt Contributions
              </Dialog.Title>
              <Dialog.Description className="text-[#f5f5fa7a] text-sm mb-6">
                Decrypt multiple contributions at once using your campaign's
                private key
              </Dialog.Description>

              <div className="space-y-6">
                {/* Private Key Input */}
                <div>
                  <label className="block text-sm font-medium text-[#f5f5faf4] mb-2">
                    Campaign Private Key
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <HiKey className="h-5 w-5 text-[#f5f5fa7a]" />
                    </div>
                    <input
                      type="password"
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-[#f5f5fa0a] border border-[#f5f5fa14] rounded-xl text-[#f5f5faf4] placeholder-[#f5f5fa7a] focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-transparent"
                      placeholder="Enter your RSA private key"
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-500 text-sm">{error}</p>
                  </div>
                )}

                {/* Progress Bar */}
                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#f5f5fa7a]">Processing...</span>
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

                {/* Results List */}
                {results.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-[#f5f5fa0a] rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          {result.status === 'success' ? (
                            <HiCheck className="w-5 h-5 text-green-400" />
                          ) : result.status === 'error' ? (
                            <HiExclamation className="w-5 h-5 text-red-400" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-[#f5f5fa7a] border-t-transparent animate-spin" />
                          )}
                          <div>
                            <p className="text-sm text-[#f5f5faf4]">
                              {result.creatorName}
                            </p>
                            <p className="text-xs text-[#f5f5fa7a]">
                              {result.ipfsHash.slice(0, 6)}...
                              {result.ipfsHash.slice(-4)}
                            </p>
                          </div>
                        </div>
                        {result.error && (
                          <span className="text-xs text-red-400">
                            {result.error}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={handleBulkDecrypt}
                    disabled={isProcessing || !privateKey}
                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:ring-offset-2 focus:ring-offset-[#0f0f17] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <HiLockOpen className="h-5 w-5" />
                        <span>Decrypt All</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadAll}
                    disabled={
                      isProcessing ||
                      results.filter((r) => r.status === 'success').length === 0
                    }
                    className="flex-1 px-6 py-3 rounded-xl border border-[#f5f5fa14] text-[#f5f5faf4] font-semibold hover:bg-[#f5f5fa14] transition-colors focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:ring-offset-2 focus:ring-offset-[#0f0f17] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <HiDownload className="h-5 w-5" />
                    <span>Download All</span>
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BulkDecryptModal;
