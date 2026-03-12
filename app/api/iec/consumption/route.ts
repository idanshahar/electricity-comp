import { NextRequest, NextResponse } from "next/server";
import {
  iecGetCustomer,
  iecGetContract,
  iecGetDevices,
  iecGetInvoices,
  iecGetConsumption,
  decryptCookiePayload,
  IecApiError,
} from "@/lib/iecApi";
import type { ConsumptionRecord, ParsedCSV } from "@/lib/types";

// 600 days × ~1.5s ÷ 30 concurrent ≈ 30s. 300s is a safe ceiling.
export const maxDuration = 300;

interface SessionWithToken {
  idToken: string;
  accessToken: string;
  israeliId: string;
}

// ---------------------------------------------------------------------------
// Concurrency worker pool — limits to `limit` in-flight requests at any time.
// Better than sequential batches: slots are refilled immediately, no idle wait.
// ---------------------------------------------------------------------------
async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

// ---------------------------------------------------------------------------
// All calendar dates "YYYY-MM-DD" from `from` to `to` inclusive.
// ---------------------------------------------------------------------------
function enumerateDates(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

// ---------------------------------------------------------------------------
// Extract hour/minute/dayOfWeek in Israel local time (UTC+2 / UTC+3 DST).
// Using Intl.DateTimeFormat avoids any dependency and works correctly on Vercel
// (which runs in UTC) — dt.getHours() would give UTC hours, not Israel hours.
// ---------------------------------------------------------------------------
const israelFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Jerusalem",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
  hour12: false,
});

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function toIsraelParts(dt: Date): { hour: number; minute: number; dayOfWeek: number } {
  const parts = israelFormatter.formatToParts(dt);
  const hour    = parseInt(parts.find(x => x.type === "hour")!.value);
  const minute  = parseInt(parts.find(x => x.type === "minute")!.value);
  const weekday = parts.find(x => x.type === "weekday")!.value;
  return { hour, minute, dayOfWeek: WEEKDAY_MAP[weekday] ?? dt.getUTCDay() };
}

function buildConsumptionRecords(
  periodConsumptions: Array<{ interval: string; consumption: number }>
): ConsumptionRecord[] {
  const records: ConsumptionRecord[] = [];
  for (const p of periodConsumptions) {
    if (!p.interval || p.consumption == null) continue;
    const dt = new Date(p.interval);
    if (isNaN(dt.getTime())) continue;
    const { hour, minute, dayOfWeek } = toIsraelParts(dt);
    records.push({
      datetime: dt,
      dayOfWeek,
      hour,
      minute,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
      kwh: p.consumption,
    });
  }
  return records;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
const CONCURRENCY = 30; // max simultaneous requests to IEC API

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("iec_session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }

    const { idToken, accessToken, israeliId } = await decryptCookiePayload<SessionWithToken>(sessionCookie);

    const customer = await iecGetCustomer(idToken, accessToken, israeliId);
    const contract = await iecGetContract(idToken, accessToken, israeliId, customer.bpNumber);
    const devices  = await iecGetDevices(idToken, accessToken, israeliId, contract.contractId);

    const invoices = await iecGetInvoices(idToken, accessToken, israeliId, contract.contractId, customer.bpNumber);
    if (invoices.length === 0) {
      return NextResponse.json({ error: "No billing invoices found for this account." }, { status: 404 });
    }

    const sorted          = invoices.sort((a, b) => a.fromDate.localeCompare(b.fromDate));
    const lastInvoiceDate = sorted[sorted.length - 1].toDate; // always the most recent toDate
    const fromDate        = sorted[0].fromDate;

    const allDates = enumerateDates(fromDate, lastInvoiceDate);
    console.log(`[IEC consumption] Firing ${allDates.length} requests with concurrency=${CONCURRENCY} (${fromDate} → ${lastInvoiceDate})`);

    const start = Date.now();

    // Build task list — first task passes debug=true to log one raw sample
    const tasks = allDates.map((date, i) => () =>
      iecGetConsumption(
        idToken, accessToken, israeliId,
        contract.contractId, devices.meterSerial, devices.meterCode,
        date,            // one specific day
        lastInvoiceDate, // always the most recent invoice toDate
        1,               // resolution=1 → 15-min intervals for that day
        i === 0          // debug=true for first day only
      )
    );

    const results = await withConcurrency(tasks, CONCURRENCY);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    const allRecords: ConsumptionRecord[] = [];
    const errorCounts: Record<string, number> = {};
    let ok = 0;

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.length > 0) {
        allRecords.push(...buildConsumptionRecords(result.value));
        ok++;
      } else if (result.status === "rejected") {
        const code = String((result.reason as IecApiError)?.statusCode ?? "unknown");
        errorCounts[code] = (errorCounts[code] ?? 0) + 1;
      }
      // fulfilled but empty (e.g. holiday/weekend with no meter data) — silently skip
    }

    console.log(`[IEC consumption] Done in ${elapsed}s — ${ok} days with data, errors:`, errorCounts);

    if (allRecords.length === 0) {
      return NextResponse.json(
        { error: "No consumption data returned. Your meter may not support remote reading." },
        { status: 404 }
      );
    }

    allRecords.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

    const totalKwh  = allRecords.reduce((s, r) => s + r.kwh, 0);
    const startDate = allRecords[0].datetime;
    const endDate   = allRecords[allRecords.length - 1].datetime;
    const dataDays  = allDates.length;

    const parsedCSV: Omit<ParsedCSV, "records" | "startDate" | "endDate"> & {
      records: SerializedRecord[];
      startDate: string;
      endDate: string;
    } = {
      records: allRecords.map((r) => ({ ...r, datetime: r.datetime.toISOString() })),
      totalKwh,
      dataDays,
      startDate: startDate.toISOString(),
      endDate:   endDate.toISOString(),
      customerName: `${customer.firstName} ${customer.lastName}`.trim() || undefined,
      meterNumber:  devices.meterSerial || undefined,
    };

    const response = NextResponse.json(parsedCSV);
    response.cookies.set("iec_session", "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
    return response;

  } catch (err) {
    if (err instanceof IecApiError) {
      console.error("[IEC consumption] IecApiError:", err.message, "status:", err.statusCode);
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[IEC consumption]", err);
    return NextResponse.json({ error: "Failed to fetch consumption data. Please try again." }, { status: 500 });
  }
}

interface SerializedRecord {
  datetime: string;
  dayOfWeek: number;
  hour: number;
  minute: number;
  isWeekend: boolean;
  kwh: number;
}
