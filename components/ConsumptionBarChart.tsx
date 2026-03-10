"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { useTranslations } from "next-intl";
import type { MonthlyConsumption, PeriodSelection } from "@/lib/types";
import { CLUSTER_COLORS } from "@/lib/clustering";

interface Props {
  months: MonthlyConsumption[];
  locale: "he" | "en";
  selectedRange: PeriodSelection;
  onBarClick?: (monthIndex: number) => void;
}

export default function ConsumptionBarChart({
  months,
  locale,
  selectedRange,
  onBarClick,
}: Props) {
  const t = useTranslations("consumptionChart");

  const data = useMemo(
    () =>
      months.map((m, i) => ({
        label: locale === "he" ? m.labelHe : m.labelEn,
        kwh: Math.round(m.totalKwh * 10) / 10,
        clusterIndex: m.clusterIndex,
        isPartial: m.isPartialMonth,
        isSelected:
          i >= selectedRange.startMonthIndex &&
          i <= selectedRange.endMonthIndex,
        monthKey: m.monthKey,
        index: i,
      })),
    [months, locale, selectedRange]
  );

  const avgKwh = useMemo(() => {
    if (months.length === 0) return 0;
    return Math.round(
      months.reduce((s, m) => s + m.totalKwh, 0) / months.length
    );
  }, [months]);

  // Unique cluster indices present in data (for legend)
  const presentClusterIndices = useMemo(() => {
    const seen = new Set<number>();
    months.forEach((m) => seen.add(m.clusterIndex));
    return [...seen].sort();
  }, [months]);

  const showLegend = presentClusterIndices.length > 1;

  const clusterLabelKey: Record<string, "low" | "normal" | "high"> = {
    "0": "low",
    "1": "normal",
    "2": "high",
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="font-semibold text-gray-900">{t("title")}</h3>
          <p className="text-sm text-gray-500">{t("subtitle")}</p>
        </div>
        {showLegend && (
          <div className="flex gap-3 flex-wrap justify-end">
            {presentClusterIndices.map((ci) => {
              const colors = CLUSTER_COLORS[ci];
              const labelKey = clusterLabelKey[String(ci)];
              return (
                <div key={ci} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm border"
                    style={{
                      backgroundColor: colors.fill,
                      borderColor: colors.border,
                    }}
                  />
                  <span className="text-xs text-gray-600">
                    {t(`clusters.${labelKey}`)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
          onClick={(payload) => {
            if (onBarClick && payload?.activeTooltipIndex != null) {
              onBarClick(payload.activeTooltipIndex);
            }
          }}
          style={{ cursor: onBarClick ? "pointer" : "default" }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={months.length > 6 ? -35 : 0}
            textAnchor={months.length > 6 ? "end" : "middle"}
            height={months.length > 6 ? 50 : 30}
          />
          <YAxis
            tickFormatter={(v) => `${v}`}
            tick={{ fontSize: 11 }}
            width={55}
            label={{
              value: "kWh",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { fontSize: 10, fill: "#9ca3af" },
            }}
          />
          <Tooltip
            formatter={(value: number, _name: string, props: { payload?: { isPartial?: boolean } }) => {
              const partial = props?.payload?.isPartial
                ? ` (${t("partialMonth")})`
                : "";
              return [
                `${value} kWh${partial}`,
                locale === "he" ? "צריכה" : "Consumption",
              ];
            }}
            labelFormatter={(label) => label}
          />
          {avgKwh > 0 && (
            <ReferenceLine
              y={avgKwh}
              stroke="#9333ea"
              strokeDasharray="4 4"
              label={{
                value: `${t("average")}: ${avgKwh}`,
                position: "right",
                fontSize: 10,
                fill: "#9333ea",
              }}
            />
          )}
          <Bar dataKey="kwh" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell
                key={entry.monthKey}
                fill={CLUSTER_COLORS[entry.clusterIndex].fill}
                stroke={CLUSTER_COLORS[entry.clusterIndex].border}
                strokeWidth={entry.isPartial ? 0 : 1}
                strokeDasharray={entry.isPartial ? "4 2" : undefined}
                fillOpacity={entry.isSelected ? 1 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {months.some((m) => m.isPartialMonth) && (
        <p className="text-xs text-gray-400 mt-1">{t("partialMonthNote")}</p>
      )}
    </div>
  );
}
