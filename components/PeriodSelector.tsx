"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import type { MonthlyConsumption, PeriodSelection } from "@/lib/types";
import { CLUSTER_COLORS } from "@/lib/clustering";

interface Props {
  months: MonthlyConsumption[];
  selection: PeriodSelection;
  onSelectionChange: (next: PeriodSelection) => void;
  locale: "he" | "en";
}

export default function PeriodSelector({
  months,
  selection,
  onSelectionChange,
  locale,
}: Props) {
  const t = useTranslations("periodSelector");
  const n = months.length;

  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      onSelectionChange({
        startMonthIndex: Math.min(val, selection.endMonthIndex),
        endMonthIndex: selection.endMonthIndex,
      });
    },
    [selection, onSelectionChange]
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      onSelectionChange({
        startMonthIndex: selection.startMonthIndex,
        endMonthIndex: Math.max(val, selection.startMonthIndex),
      });
    },
    [selection, onSelectionChange]
  );

  const handleReset = useCallback(() => {
    onSelectionChange({ startMonthIndex: 0, endMonthIndex: n - 1 });
  }, [n, onSelectionChange]);

  const isFullRange =
    selection.startMonthIndex === 0 && selection.endMonthIndex === n - 1;

  const selectedStart = months[selection.startMonthIndex];
  const selectedEnd = months[selection.endMonthIndex];
  const selectedMonthCount =
    selection.endMonthIndex - selection.startMonthIndex + 1;

  // Compute fill position percentages (always LTR internally)
  const startPct = n > 1 ? (selection.startMonthIndex / (n - 1)) * 100 : 0;
  const endPct = n > 1 ? (selection.endMonthIndex / (n - 1)) * 100 : 100;

  // If only 1 month, nothing to select
  if (n <= 1) {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{t("title")}</h3>
          <p className="text-xs text-gray-500">{t("subtitle")}</p>
        </div>
        {!isFullRange && (
          <button
            onClick={handleReset}
            className="text-xs text-purple-600 hover:text-purple-800 underline"
          >
            {t("resetFull")}
          </button>
        )}
      </div>

      {/* Selected range label */}
      <div className="text-sm font-medium text-gray-700 mb-3">
        <span className="text-purple-700">
          {locale === "he" ? selectedStart.labelHe : selectedStart.labelEn}
        </span>
        <span className="mx-2 text-gray-400">→</span>
        <span className="text-purple-700">
          {locale === "he" ? selectedEnd.labelHe : selectedEnd.labelEn}
        </span>
        <span className="ms-2 text-xs text-gray-500">
          ({selectedMonthCount}{" "}
          {selectedMonthCount === 1 ? t("month") : t("months")})
        </span>
      </div>

      {/* Slider track — always LTR so thumb positions are correct */}
      <div dir="ltr" className="relative mb-4">
        {/* Track background */}
        <div className="h-1.5 w-full bg-gray-200 rounded-full relative top-[9px]">
          {/* Filled range between thumbs */}
          <div
            className="absolute h-full bg-purple-400 rounded-full"
            style={{
              left: `${startPct}%`,
              right: `${100 - endPct}%`,
            }}
          />
        </div>

        {/* Two overlapping range inputs */}
        <div className="relative h-5">
          <input
            type="range"
            min={0}
            max={n - 1}
            step={1}
            value={selection.startMonthIndex}
            onChange={handleStartChange}
            className="period-slider-thumb"
            style={{ zIndex: selection.startMonthIndex === selection.endMonthIndex ? 5 : 3 }}
          />
          <input
            type="range"
            min={0}
            max={n - 1}
            step={1}
            value={selection.endMonthIndex}
            onChange={handleEndChange}
            className="period-slider-thumb"
            style={{ zIndex: 4 }}
          />
        </div>

        {/* Month tick labels with cluster dots */}
        <div className="flex mt-2">
          {months.map((m, i) => {
            const colors = CLUSTER_COLORS[m.clusterIndex];
            const label = locale === "he" ? m.labelHe : m.labelEn;
            // Show abbreviated label: first word only (month name)
            const shortLabel = label.split(" ")[0];
            const isEdge = i === 0 || i === n - 1;
            const isSelected =
              i >= selection.startMonthIndex && i <= selection.endMonthIndex;

            return (
              <div
                key={m.monthKey}
                className="flex-1 flex flex-col items-center gap-0.5 cursor-pointer"
                onClick={() => {
                  // Click tick: if before start, move start; if after end, move end; else do nothing
                  if (i < selection.startMonthIndex) {
                    onSelectionChange({ ...selection, startMonthIndex: i });
                  } else if (i > selection.endMonthIndex) {
                    onSelectionChange({ ...selection, endMonthIndex: i });
                  }
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full border"
                  style={{
                    backgroundColor: colors.fill,
                    borderColor: colors.border,
                    opacity: isSelected ? 1 : 0.4,
                  }}
                />
                <span
                  className={`text-[10px] leading-tight text-center ${
                    isSelected ? "text-gray-700 font-medium" : "text-gray-400"
                  } ${!isEdge && n > 8 ? "hidden sm:block" : ""}`}
                >
                  {shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!isFullRange && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t("filteredNote")}
        </p>
      )}
    </div>
  );
}
