"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, ChevronDown, ChevronUp, Zap, Info, ExternalLink } from "lucide-react";
import type { DiscountPlan, Provider } from "@/lib/types";
import { PROVIDERS } from "@/lib/providers";
import CustomPlanModal from "@/components/CustomPlanModal";

interface Props {
  selectedPlanIds: string[];
  onTogglePlan: (id: string) => void;
  onAddCustomPlan: (plan: DiscountPlan) => void;
  customPlans: DiscountPlan[];
  onCalculate: () => void;
  onBack: () => void;
  locale: "he" | "en";
}

export default function SelectStep({
  selectedPlanIds,
  onTogglePlan,
  onAddCustomPlan,
  customPlans,
  onCalculate,
  onBack,
  locale,
}: Props) {
  const t = useTranslations("select");
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
    new Set(PROVIDERS.map((p) => p.id))
  );
  const [showCustomModal, setShowCustomModal] = useState(false);

  function toggleProvider(id: string) {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Build the custom provider dynamically
  const allProviders: Provider[] =
    customPlans.length > 0
      ? [
          ...PROVIDERS,
          {
            id: "custom",
            nameHe: "תוכנית מותאמת",
            nameEn: "Custom Plan",
            color: "#6b7280",
            plans: customPlans,
          },
        ]
      : PROVIDERS;

  const allPlanIds = allProviders.flatMap((p) => p.plans.map((pl) => pl.id));

  function handleSelectAll() {
    allPlanIds.forEach((id) => {
      if (!selectedPlanIds.includes(id)) onTogglePlan(id);
    });
  }

  function handleClearAll() {
    selectedPlanIds.forEach((id) => onTogglePlan(id));
  }

  const name = (p: { nameHe: string; nameEn: string }) =>
    locale === "he" ? p.nameHe : p.nameEn;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t("title")}</h2>
        <p className="text-gray-500 mt-1">{t("description")}</p>
      </div>

      {/* Top actions */}
      <div className="flex gap-3 flex-wrap items-center">
        <button
          onClick={() => setShowCustomModal(true)}
          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-purple-400 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("addCustom")}
        </button>
        <button
          onClick={handleSelectAll}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
        >
          {t("selectAll")}
        </button>
        <button
          onClick={handleClearAll}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
        >
          {t("clearAll")}
        </button>
      </div>

      {/* Provider cards */}
      <div className="space-y-3">
        {allProviders.map((provider) => {
          const isExpanded = expandedProviders.has(provider.id);
          const selectedInProvider = provider.plans.filter((pl) =>
            selectedPlanIds.includes(pl.id)
          ).length;

          return (
            <div
              key={provider.id}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleProvider(provider.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-start"
              >
                {/* Color dot */}
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: provider.color }}
                />
                <span className="font-semibold text-gray-900 flex-1">
                  {name(provider)}
                  {provider.url && (
                    <a
                      href={provider.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 ms-2 text-xs font-normal text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </span>
                {selectedInProvider > 0 && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    {selectedInProvider} {t("plans")}
                  </span>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {provider.plans.map((plan) => {
                    const checked = selectedPlanIds.includes(plan.id);
                    return (
                      <label
                        key={plan.id}
                        className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                          checked ? "bg-purple-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onTogglePlan(plan.id)}
                          className="mt-0.5 w-4 h-4 accent-purple-600 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 text-sm">
                              {name(plan)}
                            </span>
                            <span
                              className="text-sm font-bold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: provider.color + "22",
                                color: provider.color,
                              }}
                            >
                              {plan.discountPercent}%
                            </span>
                            {plan.requiresSmartMeter && (
                              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                <Zap className="w-3 h-3" />
                                {t("smartMeterRequired")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {plan.notes && (
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Info className="w-3 h-3 shrink-0" />
                                {locale === "he" ? plan.notes : (plan.nameEn + " – " + plan.discountPercent + "% discount")}
                              </p>
                            )}
                            {plan.url && (
                              <a
                                href={plan.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-purple-500 hover:text-purple-700 hover:underline flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {locale === "he" ? "לאתר הספק" : "View plan"}
                              </a>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-200 -mx-4 px-4 py-4 sm:-mx-8 sm:px-8 flex gap-3 items-center">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors"
        >
          {t("back")}
        </button>
        <div className="flex-1 text-sm text-gray-500">
          {selectedPlanIds.length > 0
            ? `${t("selected")} ${selectedPlanIds.length} ${t("plans")}`
            : <span className="text-red-500">{t("noneSelected")}</span>}
        </div>
        <button
          onClick={onCalculate}
          disabled={selectedPlanIds.length === 0}
          className="px-8 py-3 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t("calculate")}
        </button>
      </div>

      {showCustomModal && (
        <CustomPlanModal
          onAdd={onAddCustomPlan}
          onClose={() => setShowCustomModal(false)}
          locale={locale}
        />
      )}
    </div>
  );
}
