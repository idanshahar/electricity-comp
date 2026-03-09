"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { CalculationResult } from "@/lib/types";
import { formatNIS } from "@/lib/utils";

interface Props {
  results: CalculationResult[];
  locale: "he" | "en";
}

export default function SavingsChart({ results, locale }: Props) {
  const data = results.map((r) => ({
    name:
      locale === "he"
        ? `${r.providerNameHe}\n${r.planNameHe}`
        : `${r.providerNameEn}\n${r.planNameEn}`,
    shortName: locale === "he" ? r.planNameHe : r.planNameEn,
    savings: Math.round(r.savings),
    color: r.providerColor,
    planId: r.planId,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
        layout="vertical"
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => formatNIS(v)}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="shortName"
          width={locale === "he" ? 90 : 100}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(value: number) => [formatNIS(value), locale === "he" ? "חיסכון" : "Savings"]}
          labelFormatter={(label) => label}
        />
        <Bar dataKey="savings" radius={[0, 6, 6, 0]}>
          {data.map((entry) => (
            <Cell key={entry.planId} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
