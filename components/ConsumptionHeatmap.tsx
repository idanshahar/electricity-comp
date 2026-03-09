"use client";

import { useMemo } from "react";
import type { ConsumptionRecord } from "@/lib/types";

interface Props {
  records: ConsumptionRecord[];
  locale: "he" | "en";
}

const DAY_LABELS_HE = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ConsumptionHeatmap({ records, locale }: Props) {
  const dayLabels = locale === "he" ? DAY_LABELS_HE : DAY_LABELS_EN;

  // Build avg kWh per [day][hour] matrix
  const matrix = useMemo(() => {
    const sums = Array.from({ length: 7 }, () => new Array(24).fill(0));
    const counts = Array.from({ length: 7 }, () => new Array(24).fill(0));

    for (const r of records) {
      sums[r.dayOfWeek][r.hour] += r.kwh;
      counts[r.dayOfWeek][r.hour]++;
    }

    return sums.map((dayRow, d) =>
      dayRow.map((sum, h) => (counts[d][h] > 0 ? sum / counts[d][h] : 0))
    );
  }, [records]);

  const maxVal = useMemo(
    () => Math.max(...matrix.flat()),
    [matrix]
  );

  function getColor(value: number): string {
    if (maxVal === 0) return "bg-gray-100";
    const intensity = value / maxVal;
    if (intensity < 0.1) return "bg-purple-50";
    if (intensity < 0.25) return "bg-purple-100";
    if (intensity < 0.4) return "bg-purple-200";
    if (intensity < 0.55) return "bg-purple-300";
    if (intensity < 0.7) return "bg-purple-400";
    if (intensity < 0.85) return "bg-purple-500";
    return "bg-purple-700";
  }

  const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Hour axis */}
        <div className="flex mb-1 ps-10">
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="flex-1 text-center text-[10px] text-gray-400"
            >
              {hourLabels.includes(h) ? `${h}:00` : ""}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {matrix.map((dayRow, dayIndex) => (
          <div key={dayIndex} className="flex items-center mb-0.5">
            <div className="w-10 text-xs text-gray-500 text-end pe-2 shrink-0">
              {dayLabels[dayIndex]}
            </div>
            {dayRow.map((val, hour) => (
              <div
                key={hour}
                className={`flex-1 h-6 ${getColor(val)} rounded-[2px] mx-[1px]`}
                title={`${dayLabels[dayIndex]} ${hour}:00 – ${(val * 1000).toFixed(1)} Wh`}
              />
            ))}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-1 mt-3 justify-end">
          <span className="text-xs text-gray-400 me-1">
            {locale === "he" ? "נמוך" : "Low"}
          </span>
          {["bg-purple-50", "bg-purple-100", "bg-purple-200", "bg-purple-300", "bg-purple-400", "bg-purple-500", "bg-purple-700"].map(
            (cls, i) => (
              <div key={i} className={`w-5 h-4 ${cls} rounded-sm`} />
            )
          )}
          <span className="text-xs text-gray-400 ms-1">
            {locale === "he" ? "גבוה" : "High"}
          </span>
        </div>
      </div>
    </div>
  );
}
