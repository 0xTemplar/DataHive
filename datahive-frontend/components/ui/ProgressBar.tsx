import React from 'react';

interface Step {
  label: string;
  widthPercentage?: number;
}

interface ProgressBarProps {
  steps: Step[];
  currentStep: number;
  isFinalStepComplete?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  steps,
  currentStep,
  isFinalStepComplete = false,
}) => {
  const stepWidths = steps.map(
    (step) => step.widthPercentage || 100 / steps.length
  );
  const cumulativeWidths = stepWidths.map((width, index) =>
    stepWidths.slice(0, index + 1).reduce((acc, val) => acc + val, 0)
  );
  const centerPositions = stepWidths.map(
    (width, index) => cumulativeWidths[index] - width / 2
  );

  const isLastStep = currentStep === steps.length - 1;
  const progressWidth = isLastStep
    ? isFinalStepComplete
      ? '100%'
      : `${
          centerPositions[currentStep] -
          (centerPositions[currentStep] - centerPositions[currentStep - 1]) *
            0.05
        }%`
    : `${centerPositions[currentStep]}%`;

  const dotPosition =
    isLastStep && !isFinalStepComplete
      ? `calc(${progressWidth} - 0.75rem)`
      : isLastStep && isFinalStepComplete
      ? 'calc(100% - 0.75rem)'
      : `calc(${centerPositions[currentStep]}% - 0.75rem)`;

  return (
    <div className="relative w-[898px] 2xl:w-[1100px] mt-20">
      <div className="absolute top-1/2 w-full h-0.5 bg-[#f5f5fa14] left-0 transform -translate-y-1/2"></div>
      <div
        className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-[#6366f1] to-[#a855f7] transition-all duration-500 ease-in-out transform -translate-y-1/2 progress-bar-shadow"
        style={{ width: progressWidth }}
      ></div>
      <div
        className="absolute top-[50%] transform -translate-y-1/2 w-3 h-3 bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-full transition-all duration-500 ease-in-out progress-bar-shadow"
        style={{ left: dotPosition }}
      ></div>
      <div className="flex relative z-10 -mx-6">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex flex-col items-center"
            style={{ width: `${stepWidths[index]}%` }}
          >
            <div className="relative flex justify-center mt-10">
              <span
                className={`text-[12px] leading-[20px] font-[400] ${
                  index === currentStep
                    ? 'text-[#f5f5faf4]'
                    : index < currentStep
                    ? 'text-[#f5f5faf4]'
                    : 'text-[#f5f5fa7a]'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressBar;
