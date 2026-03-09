"use client";

import { Check } from "lucide-react";
import type { WizardStep } from "@/lib/types";

interface Props {
  currentStep: WizardStep;
  labels: { upload: string; select: string; results: string };
}

const STEPS: WizardStep[] = ["upload", "select", "results"];

export default function WizardProgress({ currentStep, labels }: Props) {
  const currentIndex = STEPS.indexOf(currentStep);

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isActive = i === currentIndex;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                  isCompleted
                    ? "bg-purple-600 text-white"
                    : isActive
                    ? "bg-purple-600 text-white ring-4 ring-purple-100"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  isActive ? "text-purple-700" : isCompleted ? "text-purple-500" : "text-gray-400"
                }`}
              >
                {labels[step]}
              </span>
            </div>

            {/* Connector line (not after last) */}
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${
                  isCompleted ? "bg-purple-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
