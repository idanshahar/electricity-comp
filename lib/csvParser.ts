import Papa from "papaparse";
import type { ConsumptionRecord, ParsedCSV } from "./types";

// Supports two IEC CSV formats:
//
// Format A (3-col): "DD/MM/YYYY","HH:MM",kWh
//   dateCol=0, timeCol=1, kwhCol=2
//
// Format B (6-col): "meterCode","type","DD/MM/YYYY","HH:MM",kWh,injection
//   dateCol=2, timeCol=3, kwhCol=4

const DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

function cell(row: string[], col: number): string {
  return (row[col] ?? "").toString().trim().replace(/"/g, "");
}

function parseIECDate(dateStr: string, timeStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/** Detect which column holds the date in the first data row */
function detectDateColumn(row: string[]): number {
  for (let c = 0; c < row.length; c++) {
    if (DATE_REGEX.test(cell(row, c))) return c;
  }
  return -1;
}

export function parseCSV(fileContent: string): ParsedCSV {
  const result = Papa.parse<string[]>(fileContent, {
    skipEmptyLines: true,
  } as Papa.ParseConfig<string[]>);

  const rows = result.data;

  let dataStartIndex = -1;
  let dateCol = 0;
  let timeCol = 1;
  let kwhCol = 2;
  let customerName: string | undefined;
  let meterNumber: string | undefined;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Extract metadata from header section
    const c0 = cell(row, 0);
    const c1 = cell(row, 1);

    if (c0 === "שם לקוח" && i + 1 < rows.length) {
      customerName = cell(rows[i + 1], 0);
    }
    // Format A: separate "קוד מונה" / "מספר מונה" header row
    if (c0 === "קוד מונה" && i + 1 < rows.length) {
      meterNumber = cell(rows[i + 1], 1);
    }
    // Format B: "סוג מונה","קוד מונה","מספר מונה" header row
    if (c1 === "קוד מונה" && i + 1 < rows.length) {
      meterNumber = cell(rows[i + 1], 2);
    }

    // Detect first data row by scanning columns for a date
    const dc = detectDateColumn(row);
    if (dc !== -1) {
      // Confirm the next column looks like a time
      const possibleTime = cell(row, dc + 1);
      if (TIME_REGEX.test(possibleTime)) {
        dateCol = dc;
        timeCol = dc + 1;
        kwhCol = dc + 2;
        dataStartIndex = i;
        break;
      }
    }
  }

  if (dataStartIndex === -1) {
    throw new Error(
      "Could not find consumption data in the CSV file. " +
        "Please make sure you downloaded the meter data from the IEC website."
    );
  }

  const records: ConsumptionRecord[] = [];

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length <= kwhCol) continue;

    const dateStr = cell(row, dateCol);
    const timeStr = cell(row, timeCol);
    const kwhStr = cell(row, kwhCol);

    if (!DATE_REGEX.test(dateStr)) continue;
    if (!TIME_REGEX.test(timeStr)) continue;

    const kwh = parseFloat(kwhStr);
    if (isNaN(kwh) || kwh < 0) continue;

    const datetime = parseIECDate(dateStr, timeStr);
    const dayOfWeek = datetime.getDay(); // 0=Sun, 6=Sat

    records.push({
      datetime,
      dayOfWeek,
      hour: datetime.getHours(),
      minute: datetime.getMinutes(),
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
      kwh,
    });
  }

  if (records.length === 0) {
    throw new Error("No valid consumption records found in the CSV file.");
  }

  const totalKwh = records.reduce((sum, r) => sum + r.kwh, 0);

  const uniqueDays = new Set(records.map((r) => r.datetime.toDateString()));
  const dataDays = uniqueDays.size;

  const sorted = [...records].sort(
    (a, b) => a.datetime.getTime() - b.datetime.getTime()
  );

  return {
    records,
    totalKwh,
    dataDays,
    startDate: sorted[0].datetime,
    endDate: sorted[sorted.length - 1].datetime,
    customerName,
    meterNumber,
  };
}
