import type { Provider } from "./types";

export const IEC_RATE_NIS_PER_KWH = 0.64; // 64 agorot/kWh incl. VAT, Jan 2025

// Days helpers
const SUN_TO_THU = [0, 1, 2, 3, 4]; // Sunday=0 … Thursday=4
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const THU_FRI_SAT = [4, 5, 6];

export const PROVIDERS: Provider[] = [
  // ─── IEC baseline (no discount) ───────────────────────────────────────────
  {
    id: "iec",
    nameHe: "חברת חשמל",
    nameEn: "Israel Electric Corporation",
    color: "#1d4ed8",
    url: "https://www.iec.co.il",
    plans: [
      {
        id: "iec-standard",
        providerId: "iec",
        nameHe: "תעריף רגיל",
        nameEn: "Standard Rate",
        discountPercent: 0,
        window: null,
        requiresSmartMeter: false,
        notes: "תעריף הבסיס של חברת חשמל – ללא הנחה",
        url: "https://www.iec.co.il",
      },
    ],
  },

  // ─── Electra Power (Super Power) ──────────────────────────────────────────
  {
    id: "electra",
    nameHe: "אלקטרה פאואר",
    nameEn: "Electra Power",
    color: "#7c3aed",
    url: "https://www.super-power.co.il/",
    plans: [
      {
        id: "electra-power",
        providerId: "electra",
        nameHe: "תוכנית פאואר",
        nameEn: "Power Plan",
        discountPercent: 6.5,
        window: null,
        requiresSmartMeter: false,
        notes: "6.5% הנחה בכל שעות היממה, כל ימות השבוע",
        url: "https://www.super-power.co.il/",
      },
      {
        id: "electra-night",
        providerId: "electra",
        nameHe: "לילה פלוס",
        nameEn: "Night Plus",
        discountPercent: 21,
        window: { startHour: 23, endHour: 7, days: SUN_TO_THU },
        requiresSmartMeter: true,
        notes: "21% הנחה בין 23:00 ל-07:00, ימים א'-ה'",
        url: "https://www.super-power.co.il/",
      },
      {
        id: "electra-day",
        providerId: "electra",
        nameHe: "מסלול יום",
        nameEn: "Day Plan",
        discountPercent: 16,
        window: { startHour: 7, endHour: 17, days: SUN_TO_THU },
        requiresSmartMeter: true,
        notes: "16% הנחה בין 07:00 ל-17:00, ימים א'-ה'",
        url: "https://www.super-power.co.il/",
      },
    ],
  },

  // ─── Amisragas ────────────────────────────────────────────────────────────
  {
    id: "amisragas",
    nameHe: "אמישראגז",
    nameEn: "Amisragas",
    color: "#0891b2",
    url: "https://www.amisragas.co.il/electricity/",
    plans: [
      {
        id: "amisragas-fixed",
        providerId: "amisragas",
        nameHe: "הנחה קבועה",
        nameEn: "Fixed Discount",
        discountPercent: 7,
        window: null,
        requiresSmartMeter: false,
        notes: "7% הנחה על כל הצריכה, כל שעות היממה",
        url: "https://www.amisragas.co.il/electricity/",
      },
    ],
  },

  // ─── Pazgas ───────────────────────────────────────────────────────────────
  {
    id: "pazgas",
    nameHe: "פזגז",
    nameEn: "Pazgas",
    color: "#d97706",
    url: "https://www.pazgas.co.il/hashmal/pickapackage",
    plans: [
      {
        id: "pazgas-fixed",
        providerId: "pazgas",
        nameHe: "הנחה קבועה",
        nameEn: "Fixed Discount",
        discountPercent: 5,
        window: null,
        requiresSmartMeter: false,
        notes: "5% הנחה בכל שעות היממה",
        url: "https://www.pazgas.co.il/hashmal/pickapackage",
      },
      {
        id: "pazgas-weekend",
        providerId: "pazgas",
        nameHe: "סופ\"ש",
        nameEn: "Weekend Plan",
        discountPercent: 10,
        window: { startHour: 0, endHour: 24, days: THU_FRI_SAT },
        requiresSmartMeter: false,
        notes: "10% הנחה בחמישי, שישי ושבת – כל השעות",
        url: "https://www.pazgas.co.il/hashmal/pickapackage",
      },
      {
        id: "pazgas-night",
        providerId: "pazgas",
        nameHe: "לילה",
        nameEn: "Night Plan",
        discountPercent: 15,
        window: { startHour: 0, endHour: 7, days: SUN_TO_THU },
        requiresSmartMeter: true,
        notes: "15% הנחה בין חצות ל-07:00, ימים א'-ה'",
        url: "https://www.pazgas.co.il/hashmal/pickapackage",
      },
      {
        id: "pazgas-day",
        providerId: "pazgas",
        nameHe: "יום",
        nameEn: "Day Plan",
        discountPercent: 15,
        window: { startHour: 8, endHour: 16, days: SUN_TO_THU },
        requiresSmartMeter: true,
        notes: "15% הנחה בין 08:00 ל-16:00, ימים א'-ה'",
        url: "https://www.pazgas.co.il/hashmal/pickapackage",
      },
    ],
  },

  // ─── Bezeq Energy ─────────────────────────────────────────────────────────
  {
    id: "bezeq",
    nameHe: "בזק אנרגיה",
    nameEn: "Bezeq Energy",
    color: "#dc2626",
    url: "https://www.bezeq.co.il/benergy/",
    plans: [
      {
        id: "bezeq-fixed",
        providerId: "bezeq",
        nameHe: "הנחה קבועה",
        nameEn: "Fixed Discount",
        discountPercent: 7,
        window: null,
        requiresSmartMeter: false,
        notes: "7% הנחה על כל הצריכה",
        url: "https://www.bezeq.co.il/benergy/",
      },
      {
        id: "bezeq-day",
        providerId: "bezeq",
        nameHe: "חוסכים ביום",
        nameEn: "Day Plan",
        discountPercent: 15,
        window: { startHour: 7, endHour: 17, days: SUN_TO_THU },
        requiresSmartMeter: true,
        notes: "15% הנחה בין 07:00 ל-17:00, ימים א'-ה'",
        url: "https://www.bezeq.co.il/benergy/",
      },
      {
        id: "bezeq-night",
        providerId: "bezeq",
        nameHe: "חוסכים בלילה",
        nameEn: "Night Plan",
        discountPercent: 20,
        window: { startHour: 23, endHour: 7, days: SUN_TO_THU },
        requiresSmartMeter: true,
        notes: "20% הנחה בין 23:00 ל-07:00, ימים א'-ה'",
        url: "https://www.bezeq.co.il/benergy/",
      },
    ],
  },

  // ─── HOT Energy ───────────────────────────────────────────────────────────
  {
    id: "hot",
    nameHe: "הוט אנרגיה",
    nameEn: "HOT Energy",
    color: "#059669",
    url: "https://www.hot.net.il/heb/hotenergy/",
    plans: [
      {
        id: "hot-fixed",
        providerId: "hot",
        nameHe: "הנחה קבועה",
        nameEn: "Fixed Discount",
        discountPercent: 7,
        window: null,
        requiresSmartMeter: false,
        notes: "7% הנחה על כל הצריכה (עד 100 ₪ לחודש)",
        url: "https://www.hot.net.il/heb/hotenergy/",
      },
      {
        id: "hot-day",
        providerId: "hot",
        nameHe: "חוסכים ביום",
        nameEn: "Day Plan",
        discountPercent: 15,
        window: { startHour: 7, endHour: 17, days: SUN_TO_THU },
        requiresSmartMeter: true,
        notes: "15% הנחה בין 07:00 ל-17:00, ימים א'-ה'",
        url: "https://www.hot.net.il/heb/hotenergy/",
      },
      {
        id: "hot-night",
        providerId: "hot",
        nameHe: "חוסכים בלילה",
        nameEn: "Night Plan",
        discountPercent: 20,
        window: { startHour: 23, endHour: 7, days: ALL_DAYS },
        requiresSmartMeter: true,
        notes: "20% הנחה בין 23:00 ל-07:00, כל ימות השבוע",
        url: "https://www.hot.net.il/heb/hotenergy/",
      },
    ],
  },

  // ─── Partner Power ────────────────────────────────────────────────────────
  {
    id: "partner",
    nameHe: "פרטנר פאואר",
    nameEn: "Partner Power",
    color: "#0284c7",
    url: "https://www.partner.co.il/n/partnerpower/lobby",
    plans: [
      {
        id: "partner-fixed",
        providerId: "partner",
        nameHe: "הנחה קבועה",
        nameEn: "Fixed Discount",
        discountPercent: 6,
        window: null,
        requiresSmartMeter: false,
        notes: "6% הנחה על כל הצריכה (ממוצע שנים 1-3)",
        url: "https://www.partner.co.il/n/partnerpower/lobby",
      },
      {
        id: "partner-wfh",
        providerId: "partner",
        nameHe: "עבודה מהבית",
        nameEn: "Work From Home",
        discountPercent: 15,
        window: { startHour: 8, endHour: 17, days: SUN_TO_THU },
        requiresSmartMeter: true,
        notes: "15% הנחה בין 08:00 ל-17:00, ימים א'-ה'",
        url: "https://www.partner.co.il/n/partnerpower/lobby",
      },
      {
        id: "partner-night",
        providerId: "partner",
        nameHe: "ינשופי הלילה",
        nameEn: "Night Owls",
        discountPercent: 20,
        window: { startHour: 0, endHour: 6, days: SUN_TO_THU },
        requiresSmartMeter: true,
        notes: "20% הנחה בין חצות ל-06:00, ימים א'-ה'",
        url: "https://www.partner.co.il/n/partnerpower/lobby",
      },
    ],
  },

  // ─── Cellcom Energy ───────────────────────────────────────────────────────
  {
    id: "cellcom",
    nameHe: "סלקום אנרגיה",
    nameEn: "Cellcom Energy",
    color: "#7c3aed",
    url: "https://cellcom.co.il/sale/jet/energy/",
    plans: [
      {
        id: "cellcom-fixed",
        providerId: "cellcom",
        nameHe: "הנחה קבועה",
        nameEn: "Fixed Discount",
        discountPercent: 6,
        window: null,
        requiresSmartMeter: false,
        notes: "6% הנחה על כל הצריכה (ממוצע שנים 1-3)",
        url: "https://cellcom.co.il/sale/jet/energy/",
      },
    ],
  },
];

export function getAllPlans() {
  return PROVIDERS.flatMap((p) => p.plans);
}

export function getPlanById(id: string) {
  return getAllPlans().find((p) => p.id === id);
}

export function getProviderById(id: string) {
  return PROVIDERS.find((p) => p.id === id);
}
