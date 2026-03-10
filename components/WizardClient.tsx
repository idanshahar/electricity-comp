"use client";

import { useState, useCallback } from "react";
import type { ParsedCSV, DiscountPlan, CalculationResult, WizardStep } from "@/lib/types";
import { PROVIDERS } from "@/lib/providers";
import { calculateAllPlans } from "@/lib/calculator";
import WizardProgress from "@/components/WizardProgress";
import UploadStep from "@/components/steps/UploadStep";
import SelectStep from "@/components/steps/SelectStep";
import ResultsStep from "@/components/steps/ResultsStep";

interface Props {
  locale: "he" | "en";
  stepLabels: { upload: string; select: string; results: string };
}

// Default: select all plans
const DEFAULT_SELECTED = PROVIDERS.flatMap((p) => p.plans.map((pl) => pl.id));

export default function WizardClient({ locale, stepLabels }: Props) {
  const [step, setStep] = useState<WizardStep>("upload");
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>(DEFAULT_SELECTED);
  const [customPlans, setCustomPlans] = useState<DiscountPlan[]>([]);
  const [results, setResults] = useState<CalculationResult[]>([]);

  const handleUploadComplete = useCallback((data: ParsedCSV) => {
    setParsedCSV(data);
    setStep("select");
  }, []);

  const handleTogglePlan = useCallback((id: string) => {
    setSelectedPlanIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleAddCustomPlan = useCallback((plan: DiscountPlan) => {
    setCustomPlans((prev) => [...prev, plan]);
    setSelectedPlanIds((prev) => [...prev, plan.id]);
  }, []);

  const handleCalculate = useCallback(() => {
    if (!parsedCSV) return;

    // Gather all plans (built-in + custom) that are selected
    const allBuiltInPlans = PROVIDERS.flatMap((p) => p.plans);
    const allPlans = [...allBuiltInPlans, ...customPlans];
    const plansToCalculate = allPlans.filter((p) => selectedPlanIds.includes(p.id));

    const calcResults = calculateAllPlans(
      parsedCSV.records,
      plansToCalculate,
      parsedCSV.dataDays
    );

    setResults(calcResults);
    setStep("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [parsedCSV, selectedPlanIds, customPlans]);

  const handleStartOver = useCallback(() => {
    setParsedCSV(null);
    setSelectedPlanIds(DEFAULT_SELECTED);
    setCustomPlans([]);
    setResults([]);
    setStep("upload");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <WizardProgress currentStep={step} labels={stepLabels} />
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        {step === "upload" && (
          <UploadStep onComplete={handleUploadComplete} locale={locale} />
        )}
        {step === "select" && (
          <SelectStep
            selectedPlanIds={selectedPlanIds}
            onTogglePlan={handleTogglePlan}
            onAddCustomPlan={handleAddCustomPlan}
            customPlans={customPlans}
            onCalculate={handleCalculate}
            onBack={() => setStep("upload")}
            locale={locale}
          />
        )}
        {step === "results" && parsedCSV && (
          <ResultsStep
            parsedCSV={parsedCSV}
            initialResults={results}
            selectedPlanIds={selectedPlanIds}
            customPlans={customPlans}
            onStartOver={handleStartOver}
            locale={locale}
          />
        )}
      </div>
    </div>
  );
}
