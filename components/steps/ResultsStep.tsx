"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Trophy, Zap, TrendingUp, RotateCcw } from "lucide-react";
import type {
  CalculationResult,
  ParsedCSV,
  DiscountPlan,
  PeriodSelection,
} from "@/lib/types";
import { PROVIDERS } from "@/lib/providers";
import { calculateAllPlans } from "@/lib/calculator";
import { buildMonthlyConsumption } from "@/lib/clustering";
import SavingsChart from "@/components/SavingsChart";
import ConsumptionBarChart from "@/components/ConsumptionBarChart";
import PeriodSelector from "@/components/PeriodSelector";
import { formatNIS, formatKwh, formatPercent } from "@/lib/utils";

interface Props {
  parsedCSV: ParsedCSV;
  initialResults: CalculationResult[];
  selectedPlanIds: string[];
  customPlans: DiscountPlan[];
  onStartOver: () => void;
  locale: "he" | "en";
}

type ViewMode = "plan" | "provider";

export default function ResultsStep({
  parsedCSV,
  initialResults,
  selectedPlanIds,
  customPlans,
  onStartOver,
  locale,
}: Props) {
  const t = useTranslations("results");
  const [viewMode, setViewMode] = useState<ViewMode>("plan");

  // Build monthly consumption data with cluster assignments
  const months = useMemo(
    () =>
      buildMonthlyConsumption(
        parsedCSV.records,
        parsedCSV.startDate,
        parsedCSV.endDate
      ),
    [parsedCSV]
  );

  // Period selection state — defaults to full range
  const [selection, setSelection] = useState<PeriodSelection>({
    startMonthIndex: 0,
    endMonthIndex: Math.max(0, months.length - 1),
  });

  const isFullRange =
    selection.startMonthIndex === 0 &&
    selection.endMonthIndex === months.length - 1;

  // Compute filtered results based on selected period
  const filteredResults = useMemo(() => {
    if (isFullRange || months.length === 0) return initialResults;

    const startMonth = months[selection.startMonthIndex];
    const endMonth = months[selection.endMonthIndex];

    const rangeStart = new Date(startMonth.year, startMonth.month, 1);
    const rangeEnd = new Date(
      endMonth.year,
      endMonth.month + 1,
      0,
      23,
      59,
      59
    );

    const filteredRecords = parsedCSV.records.filter(
      (r) => r.datetime >= rangeStart && r.datetime <= rangeEnd
    );

    if (filteredRecords.length === 0) return initialResults;

    const uniqueDays = new Set(
      filteredRecords.map((r) => r.datetime.toDateString())
    );
    const filteredDays = uniqueDays.size;

    const allBuiltInPlans = PROVIDERS.flatMap((p) => p.plans);
    const allPlans = [...allBuiltInPlans, ...customPlans];
    const plansToCalculate = allPlans.filter((p) =>
      selectedPlanIds.includes(p.id)
    );

    return calculateAllPlans(filteredRecords, plansToCalculate, filteredDays);
  }, [
    selection,
    isFullRange,
    months,
    parsedCSV.records,
    initialResults,
    selectedPlanIds,
    customPlans,
  ]);

  const name = (r: CalculationResult) =>
    locale === "he"
      ? { provider: r.providerNameHe, plan: r.planNameHe }
      : { provider: r.providerNameEn, plan: r.planNameEn };

  // By provider: keep only the best plan per provider
  const byProvider = useMemo(() => {
    const map = new Map<string, CalculationResult>();
    for (const r of filteredResults) {
      const existing = map.get(r.providerId);
      if (!existing || r.savings > existing.savings) {
        map.set(r.providerId, r);
      }
    }
    return [...map.values()].sort((a, b) => b.savings - a.savings);
  }, [filteredResults]);

  const displayResults = viewMode === "plan" ? filteredResults : byProvider;
  const best = filteredResults[0];

  // dataDays for display: use filtered period's day count when filtering
  const displayDays = isFullRange
    ? parsedCSV.dataDays
    : (best?.dataDays ?? parsedCSV.dataDays);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t("title")}</h2>
          <p className="text-gray-500 mt-1">
            {t("description", { days: displayDays })}
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

      {/* Monthly consumption bar chart */}
      {months.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-4">
          <ConsumptionBarChart
            months={months}
            locale={locale}
            selectedRange={selection}
          />
        </div>
      )}

      {/* Period range selector */}
      {months.length > 1 && (
        <PeriodSelector
          months={months}
          selection={selection}
          onSelectionChange={setSelection}
          locale={locale}
        />
      )}

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
                  <td className="px-4 py-3 text-gray-700">{n.plan}</td>
                  <td className="px-4 py-3 text-end text-gray-600">
                    {isBaseline ? "—" : formatKwh(r.eligibleKwh)}
                    {!isBaseline && (
                      <span className="text-xs text-gray-400 block">
                        ({formatPercent(r.eligiblePct)})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <span
                      className={`font-semibold ${r.savings > 0 ? "text-green-700" : "text-gray-500"}`}
                    >
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
