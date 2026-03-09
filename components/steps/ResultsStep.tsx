"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Trophy, Zap, TrendingUp, RotateCcw } from "lucide-react";
import type { CalculationResult } from "@/lib/types";
import SavingsChart from "@/components/SavingsChart";
import { formatNIS, formatKwh, formatPercent } from "@/lib/utils";

interface Props {
  results: CalculationResult[];
  dataDays: number;
  onStartOver: () => void;
  locale: "he" | "en";
}

type ViewMode = "plan" | "provider";

export default function ResultsStep({
  results,
  dataDays,
  onStartOver,
  locale,
}: Props) {
  const t = useTranslations("results");
  const [viewMode, setViewMode] = useState<ViewMode>("plan");

  const name = (r: CalculationResult) =>
    locale === "he"
      ? { provider: r.providerNameHe, plan: r.planNameHe }
      : { provider: r.providerNameEn, plan: r.planNameEn };

  // By provider: keep only the best plan per provider
  const byProvider = useMemo(() => {
    const map = new Map<string, CalculationResult>();
    for (const r of results) {
      const existing = map.get(r.providerId);
      if (!existing || r.savings > existing.savings) {
        map.set(r.providerId, r);
      }
    }
    return [...map.values()].sort((a, b) => b.savings - a.savings);
  }, [results]);

  const displayResults = viewMode === "plan" ? results : byProvider;
  const best = results[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t("title")}</h2>
          <p className="text-gray-500 mt-1">
            {t("description", { days: dataDays })}
          </p>
        </div>
        <button
          onClick={onStartOver}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t("startOver")}
        </button>
      </div>

      {/* Summary cards */}
      {best && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            icon={<Trophy className="w-5 h-5 text-yellow-500" />}
            label={t("bestPlan")}
            value={`${locale === "he" ? best.providerNameHe : best.providerNameEn} – ${locale === "he" ? best.planNameHe : best.planNameEn}`}
            color="bg-yellow-50 border-yellow-200"
          />
          <SummaryCard
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            label={t("maxSavings")}
            value={formatNIS(best.savings)}
            sub={`${formatPercent(best.effectiveDiscountPct)} ${locale === "he" ? "הנחה אפקטיבית" : "effective discount"}`}
            color="bg-green-50 border-green-200"
          />
          <SummaryCard
            icon={<Zap className="w-5 h-5 text-purple-500" />}
            label={t("annualEst")}
            value={formatNIS(best.annualizedSavings)}
            sub={locale === "he" ? "בהנחה שהצריכה נשארת זהה" : "assuming same usage pattern"}
            color="bg-purple-50 border-purple-200"
          />
        </div>
      )}

      {/* View toggle */}
      <div className="flex gap-2">
        {(["plan", "provider"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              viewMode === mode
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {mode === "plan" ? t("viewByPlan") : t("viewByProvider")}
          </button>
        ))}
      </div>

      {/* Results table */}
      <div className="border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-start text-gray-600 font-medium">#</th>
              <th className="px-4 py-3 text-start text-gray-600 font-medium">{t("provider")}</th>
              <th className="px-4 py-3 text-start text-gray-600 font-medium">{t("plan")}</th>
              <th className="px-4 py-3 text-end text-gray-600 font-medium">{t("eligibleKwh")}</th>
              <th className="px-4 py-3 text-end text-gray-600 font-medium">{t("savings")}</th>
              <th className="px-4 py-3 text-end text-gray-600 font-medium">{t("effectivePct")}</th>
              <th className="px-4 py-3 text-end text-gray-600 font-medium">{t("annualSavings")}</th>
              <th className="px-4 py-3 text-center text-gray-600 font-medium">{t("smartMeter")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayResults.map((r, i) => {
              const n = name(r);
              const isBaseline = r.planId === "iec-standard";
              return (
                <tr
                  key={r.planId}
                  className={`${i === 0 && !isBaseline ? "bg-green-50/50" : ""} hover:bg-gray-50 transition-colors`}
                >
                  <td className="px-4 py-3 text-gray-400">
                    {i === 0 && !isBaseline ? "🏆" : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: r.providerColor }}
                      />
                      {r.planUrl ? (
                        <a
                          href={r.planUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-gray-900 hover:text-purple-600 hover:underline transition-colors"
                        >
                          {n.provider}
                        </a>
                      ) : (
                        <span className="font-medium text-gray-900">{n.provider}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {n.plan}
                  </td>
                  <td className="px-4 py-3 text-end text-gray-600">
                    {isBaseline ? "—" : formatKwh(r.eligibleKwh)}
                    {!isBaseline && (
                      <span className="text-xs text-gray-400 block">
                        ({formatPercent(r.eligiblePct)})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <span className={`font-semibold ${r.savings > 0 ? "text-green-700" : "text-gray-500"}`}>
                      {r.savings > 0 ? `+ ${formatNIS(r.savings)}` : t("noSavings")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end text-gray-700">
                    {isBaseline ? "—" : formatPercent(r.effectiveDiscountPct)}
                  </td>
                  <td className="px-4 py-3 text-end text-gray-700">
                    {isBaseline ? "—" : (
                      <span className="font-medium text-purple-700">
                        {formatNIS(r.annualizedSavings)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.requiresSmartMeter ? (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        {t("required")}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">{t("notRequired")}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Chart */}
      <div className="border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-4">{t("chart")}</h3>
        <SavingsChart
          results={displayResults.filter((r) => r.planId !== "iec-standard")}
          locale={locale}
        />
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 text-center">
        {locale === "he"
          ? "* הערכות מבוססות על תעריף בסיס של 64 אגורות לקוט\"ש (כולל מע\"מ). התוצאות הן הערכה בלבד."
          : "* Estimates based on IEC baseline rate of 64 agorot/kWh (incl. VAT). Results are estimates only."}
      </p>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`border rounded-xl p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
