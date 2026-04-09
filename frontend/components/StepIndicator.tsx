import React from "react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-4 mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <React.Fragment key={stepNum}>
            <div className={`w-10 h-10 flex items-center justify-center font-heading font-black text-lg border-neo transition-all ${isActive ? 'bg-[#FFE500] shadow-[4px_4px_0px_#0A0A0A] scale-110' : isCompleted ? 'bg-[#00CC66] text-white my-1 mx-1' : 'bg-white text-[#888]'}`}>
              {stepNum}
            </div>
            {stepNum < totalSteps && (
              <div className="flex-1 h-0.5 border-t-4 border-[#0A0A0A] border-dashed" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
