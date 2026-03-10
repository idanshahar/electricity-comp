import type {
  ConsumptionRecord,
  MonthlyConsumption,
  ConsumptionCluster,
} from "./types";

const MONTH_NAMES_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTH_NAMES_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

// Z-score threshold for classifying as high/low
const CLUSTER_THRESHOLD = 0.5;
// Minimum coefficient of variation to bother clustering (8%)
const MIN_CV_TO_CLUSTER = 0.08;

export const CLUSTER_COLORS: Record<
  number,
  { fill: string; border: string; label: string }
> = {
  0: { fill: "#bfdbfe", border: "#3b82f6", label: "low" },   // blue  = low
  1: { fill: "#d1fae5", border: "#10b981", label: "normal" }, // green = normal
  2: { fill: "#fecaca", border: "#ef4444", label: "high" },   // red   = high
};

/**
 * Given raw ConsumptionRecords, returns an array of MonthlyConsumption
 * sorted chronologically, with cluster assignments.
 */
export function buildMonthlyConsumption(
  records: ConsumptionRecord[],
  startDate: Date,
  endDate: Date
): MonthlyConsumption[] {
  // Step 1: Aggregate by year+month
  const monthMap = new Map<
    string,
    { totalKwh: number; recordCount: number }
  >();

  for (const record of records) {
    const y = record.datetime.getFullYear();
    const m = record.datetime.getMonth(); // 0-indexed
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    const existing = monthMap.get(key) ?? { totalKwh: 0, recordCount: 0 };
    existing.totalKwh += record.kwh;
    existing.recordCount += 1;
    monthMap.set(key, existing);
  }

  // Step 2: Sort chronologically
  const sortedKeys = [...monthMap.keys()].sort();
  if (sortedKeys.length === 0) return [];

  const firstKey = sortedKeys[0];
  const lastKey = sortedKeys[sortedKeys.length - 1];

  // Step 3: Build MonthlyConsumption objects
  const months: MonthlyConsumption[] = sortedKeys.map((key) => {
    const [yearStr, monthStr] = key.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr) - 1; // back to 0-indexed
    const { totalKwh, recordCount } = monthMap.get(key)!;

    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const isPartialMonth =
      (key === firstKey && startDate.getDate() > 1) ||
      (key === lastKey && endDate.getDate() < lastDayOfMonth);

    return {
      year,
      month,
      monthKey: key,
      labelEn: `${MONTH_NAMES_EN[month]} ${year}`,
      labelHe: `${MONTH_NAMES_HE[month]} ${year}`,
      totalKwh,
      cluster: "normal" as ConsumptionCluster,
      clusterIndex: 1,
      recordCount,
      isPartialMonth,
    };
  });

  // Step 4: Assign clusters
  return assignClusters(months);
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  const variance =
    values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function assignClusters(months: MonthlyConsumption[]): MonthlyConsumption[] {
  if (months.length <= 1) {
    return months.map((m) => ({ ...m, cluster: "normal" as ConsumptionCluster, clusterIndex: 1 }));
  }

  const kwhs = months.map((m) => m.totalKwh);
  const avg = mean(kwhs);
  const sd = stdDev(kwhs, avg);

  // If consumption is very flat (CV < 8%), don't cluster
  const cv = avg > 0 ? sd / avg : 0;
  if (cv < MIN_CV_TO_CLUSTER) {
    return months.map((m) => ({ ...m, cluster: "normal" as ConsumptionCluster, clusterIndex: 1 }));
  }

  const result = months.map((m) => {
    const zScore = sd > 0 ? (m.totalKwh - avg) / sd : 0;
    let cluster: ConsumptionCluster;
    let clusterIndex: number;
    if (zScore > CLUSTER_THRESHOLD) {
      cluster = "high";
      clusterIndex = 2;
    } else if (zScore < -CLUSTER_THRESHOLD) {
      cluster = "low";
      clusterIndex = 0;
    } else {
      cluster = "normal";
      clusterIndex = 1;
    }
    return { ...m, cluster, clusterIndex };
  });

  // If only one unique cluster emerged, reset all to "normal"
  const uniqueClusters = new Set(result.map((m) => m.cluster));
  if (uniqueClusters.size === 1) {
    return result.map((m) => ({ ...m, cluster: "normal" as ConsumptionCluster, clusterIndex: 1 }));
  }

  return result;
}
