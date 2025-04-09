import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import useCampaignStore from '@/helpers/store/useCampaignStore';

interface InitialSubmissionProps {
  onNext: () => void;
  submissionData: {
    name: string;
    file: File | null;
  };
  updateSubmissionData: (
    data: Partial<{ name: string; file: File | null }>
  ) => void;
}

const InitialSubmission: React.FC<InitialSubmissionProps> = ({
  onNext,
  submissionData,
  updateSubmissionData,
}) => {
  const { campaign } = useCampaignStore();

  const getAcceptedFileTypes = () => {
    if (!campaign) return {};

    return campaign.campaign_type === 'Text'
      ? {
          'application/json': ['.json'],
          'text/csv': ['.csv'],
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
            '.xlsx',
          ],
          'application/pdf': ['.pdf'],
          'text/plain': ['.txt'],
          'application/msword': ['.doc'],
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            ['.docx'],
        }
      : {
          'image/jpeg': ['.jpg', '.jpeg'],
          'image/png': ['.png'],
          'image/webp': ['.webp'],
        };
  };

  const getFileTypeMessage = () => {
    if (!campaign) return '';

    return campaign.campaign_type === 'Text'
      ? 'Supports JSON, CSV, XLSX, PDF, TXT, DOC, and DOCX files'
      : 'Supports JPG, JPEG, PNG, and WEBP files';
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        updateSubmissionData({ file: acceptedFiles[0] });
      }
    },
    [updateSubmissionData]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: getAcceptedFileTypes(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionData.file) {
      onNext();
    }
  };

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex-1">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#f5f5faf4] mb-2">
              Upload File
            </label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                ${
                  isDragActive
                    ? 'border-[#a855f7] bg-[#a855f7]/10'
                    : 'border-[#f5f5fa14] hover:border-[#a855f7] hover:bg-[#f5f5fa0a]'
                }`}
            >
              <input {...getInputProps()} />
              <CloudArrowUpIcon className="w-12 h-12 mx-auto text-[#a855f7] mb-4" />
              {submissionData.file ? (
                <div className="space-y-2">
                  <p className="text-[#f5f5faf4] font-medium">
                    {submissionData.file.name}
                  </p>
                  <p className="text-[#f5f5fa7a] text-sm">
                    Click or drag to replace the file
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[#f5f5faf4] font-medium">
                    Drop your file here, or click to select
                  </p>
                  <p className="text-[#f5f5fa7a] text-sm">
                    {getFileTypeMessage()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4 pb-[10px]">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={!submissionData.file}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:ring-offset-2 focus:ring-offset-[#0f0f17] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Verification
        </button>
      </div>
    </div>
  );
};

export default InitialSubmission;
