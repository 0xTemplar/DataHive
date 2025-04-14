import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { HiX } from 'react-icons/hi';
import {
  CloudArrowUpIcon,
  SparklesIcon,
  LockClosedIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import InitialSubmission from '@/components/modals/submit-data-steps/InitialSubmission';
import AIVerification from '@/components/modals/submit-data-steps/AIVerification';
import EncryptData from '@/components/modals/submit-data-steps/EncryptData';
import SubmissionSuccess from '@/components/modals/submit-data-steps/SubmissionSuccess';

interface SubmitDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  { id: 1, name: 'Upload Data', icon: CloudArrowUpIcon },
  { id: 2, name: 'AI Verification', icon: SparklesIcon },
  { id: 3, name: 'Upload Data', icon: LockClosedIcon },
  { id: 4, name: 'Success', icon: CheckCircleIcon },
];

const initialFormState = {
  name: '',
  file: null,
  aiVerificationResult: null,
  encryptionStatus: null,
};

const SubmitDataModal: React.FC<SubmitDataModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [submissionData, setSubmissionData] = useState(initialFormState);

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const updateSubmissionData = (data: Partial<typeof submissionData>) => {
    setSubmissionData((prev) => ({ ...prev, ...data }));
  };

  const handleReset = () => {
    setSubmissionData(initialFormState);
    setCurrentStep(1);
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <InitialSubmission
            onNext={handleNext}
            submissionData={submissionData}
            updateSubmissionData={updateSubmissionData}
          />
        );
      case 2:
        return (
          <AIVerification
            onNext={handleNext}
            onBack={handleBack}
            submissionData={submissionData}
            updateSubmissionData={updateSubmissionData}
          />
        );
      case 3:
        return (
          <EncryptData
            onNext={handleNext}
            onBack={handleBack}
            submissionData={submissionData}
            updateSubmissionData={updateSubmissionData}
          />
        );
      case 4:
        return (
          <SubmissionSuccess
            onClose={onClose}
            onReset={handleReset}
            submissionData={submissionData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={handleModalClose}
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
            <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-[#0f0f17] p-6 shadow-xl transition-all border border-[#f5f5fa14]">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-[#f5f5fa7a] hover:text-white transition-colors"
              >
                <HiX className="h-6 w-6" />
              </button>

              {/* Header */}
              <Dialog.Title className="text-2xl font-bold text-white mb-2">
                Submit Data
              </Dialog.Title>
              <Dialog.Description className="text-[#f5f5fa7a] text-sm mb-6">
                Follow the steps to submit your data securely
              </Dialog.Description>

              {/* Stepper */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => (
                    <React.Fragment key={step.id}>
                      {/* Step Circle */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center
                            ${
                              step.id === currentStep
                                ? 'border-[#a855f7] bg-[#a855f7]/10'
                                : step.id < currentStep
                                ? 'border-[#22c55e] bg-[#22c55e]/10'
                                : 'border-[#f5f5fa14] bg-[#f5f5fa0a]'
                            }`}
                        >
                          <step.icon
                            className={`w-5 h-5 
                              ${
                                step.id === currentStep
                                  ? 'text-[#a855f7]'
                                  : step.id < currentStep
                                  ? 'text-[#22c55e]'
                                  : 'text-[#f5f5fa7a]'
                              }`}
                          />
                        </div>
                        <span
                          className={`mt-2 text-xs font-medium
                            ${
                              step.id === currentStep
                                ? 'text-[#a855f7]'
                                : step.id < currentStep
                                ? 'text-[#22c55e]'
                                : 'text-[#f5f5fa7a]'
                            }`}
                        >
                          {step.name}
                        </span>
                      </div>
                      {/* Connector Line */}
                      {index < steps.length - 1 && (
                        <div
                          className={`flex-1 h-[2px] mx-4
                            ${
                              step.id < currentStep
                                ? 'bg-[#22c55e]'
                                : 'bg-[#f5f5fa14]'
                            }`}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Step Content */}
              <div className=" overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
                <div className="pb-4">{renderStep()}</div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SubmitDataModal;
