import type { ConsumptionRecord, DiscountPlan, CalculationResult } from "./types";
import { IEC_RATE_NIS_PER_KWH, getProviderById } from "./providers";

function isInTimeWindow(record: ConsumptionRecord, plan: DiscountPlan): boolean {
  if (!plan.window) return true; // flat discount, all hours

  const { startHour, endHour, days } = plan.window;

  // Check day match
  if (!days.includes(record.dayOfWeek)) return false;

  // endHour === 24 means full day
  if (endHour === 24) return true;

  const h = record.hour;

  // Midnight-wrapping window (e.g. 23:00-07:00)
  if (startHour > endHour) {
    return h >= startHour || h < endHour;
  }

  // Normal window (e.g. 07:00-17:00)
  return h >= startHour && h < endHour;
}

export function calculatePlan(
  records: ConsumptionRecord[],
  plan: DiscountPlan,
  dataDays: number,
  iecRate = IEC_RATE_NIS_PER_KWH
): CalculationResult {
  const provider = getProviderById(plan.providerId);

  let originalCost = 0;
  let discountedCost = 0;
  let eligibleKwh = 0;
  let totalKwh = 0;

  for (const record of records) {
    const cost = record.kwh * iecRate;
    originalCost += cost;
    totalKwh += record.kwh;

    if (isInTimeWindow(record, plan)) {
      eligibleKwh += record.kwh;
      discountedCost += cost * (1 - plan.discountPercent / 100);
    } else {
      discountedCost += cost;
    }
  }

  const savings = originalCost - discountedCost;
  const effectiveDiscountPct =
    originalCost > 0 ? (savings / originalCost) * 100 : 0;
  const annualizedSavings = dataDays > 0 ? (savings / dataDays) * 365 : 0;

  return {
    planId: plan.id,
    planNameHe: plan.nameHe,
    planNameEn: plan.nameEn,
    providerNameHe: provider?.nameHe ?? plan.providerId,
    providerNameEn: provider?.nameEn ?? plan.providerId,
    providerId: plan.providerId,
    providerColor: provider?.color ?? "#6b7280",
    totalKwh,
    eligibleKwh,
    eligiblePct: totalKwh > 0 ? (eligibleKwh / totalKwh) * 100 : 0,
    originalCost,
    discountedCost,
    savings,
    effectiveDiscountPct,
    annualizedSavings,
    dataDays,
    requiresSmartMeter: plan.requiresSmartMeter,
    planUrl: plan.url,
  };
}

export function calculateAllPlans(
  records: ConsumptionRecord[],
  plans: DiscountPlan[],
  dataDays: number,
  iecRate = IEC_RATE_NIS_PER_KWH
): CalculationResult[] {
  return plans
    .map((plan) => calculatePlan(records, plan, dataDays, iecRate))
    .sort((a, b) => b.savings - a.savings);
}
