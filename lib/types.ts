export interface ConsumptionRecord {
  datetime: Date;
  dayOfWeek: number; // 0=Sun, 6=Sat
  hour: number; // 0-23
  minute: number; // 0,15,30,45
  isWeekend: boolean; // Fri(5) or Sat(6)
  kwh: number;
}

export interface ParsedCSV {
  records: ConsumptionRecord[];
  totalKwh: number;
  dataDays: number;
  startDate: Date;
  endDate: Date;
  customerName?: string;
  meterNumber?: string;
}

export interface TimeWindow {
  startHour: number; // inclusive
  endHour: number; // exclusive (wraps midnight if start > end)
  days: number[]; // 0=Sun … 6=Sat
}

export interface DiscountPlan {
  id: string;
  providerId: string;
  nameHe: string;
  nameEn: string;
  discountPercent: number;
  window: TimeWindow | null; // null = all hours all days
  requiresSmartMeter: boolean;
  notes?: string;
  url?: string; // link to this specific plan page
  isCustom?: boolean;
}

export interface Provider {
  id: string;
  nameHe: string;
  nameEn: string;
  color: string; // brand color for UI
  url?: string; // link to provider's electricity plans page
  plans: DiscountPlan[];
  isCustom?: boolean;
}

export interface CalculationResult {
  planId: string;
  planNameHe: string;
  planNameEn: string;
  providerNameHe: string;
  providerNameEn: string;
  providerId: string;
  providerColor: string;
  totalKwh: number;
  eligibleKwh: number; // kWh that fell inside discount window
  eligiblePct: number; // % of total kWh in window
  originalCost: number; // NIS at IEC baseline
  discountedCost: number;
  savings: number;
  effectiveDiscountPct: number; // savings / originalCost * 100
  annualizedSavings: number; // extrapolated to 365 days
  dataDays: number;
  requiresSmartMeter: boolean;
  planUrl?: string;
}

export type WizardStep = "upload" | "select" | "results";

export interface CustomPlanFormData {
  nameHe: string;
  nameEn: string;
  discountPercent: number;
  allHours: boolean;
  startHour: number;
  endHour: number;
  days: number[];
}
