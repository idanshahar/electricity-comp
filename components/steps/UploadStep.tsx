"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload, FileText, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { parseCSV } from "@/lib/csvParser";
import type { ParsedCSV } from "@/lib/types";
import ConsumptionHeatmap from "@/components/ConsumptionHeatmap";
import { formatKwh } from "@/lib/utils";

interface Props {
  onComplete: (data: ParsedCSV) => void;
  locale: "he" | "en";
}

export default function UploadStep({ onComplete, locale }: Props) {
  const t = useTranslations("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const text = await file.text();
        const data = parseCSV(text);
        setParsed(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const formatDate = (d: Date) =>
    d.toLocaleDateString(locale === "he" ? "he-IL" : "en-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t("title")}</h2>
        <p className="text-gray-500 mt-1">{t("description")}</p>
      </div>

      {/* How-to tip */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">💡 {t("howTo")}</p>
        <p className="text-blue-600">{t("howToDesc")}</p>
      </div>

      {/* Dropzone */}
      {!parsed && (
        <label
          onDragEnter={() => setIsDragging(true)}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-colors ${
            isDragging
              ? "border-purple-500 bg-purple-50"
              : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50/40"
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
            <Upload className="w-8 h-8 text-purple-600" />
          </div>
          <div className="text-center">
            <p className="text-gray-700 font-medium">{t("dropzone")}</p>
            <p className="text-gray-400 text-sm mt-1">{t("or")}</p>
          </div>
          <div className="px-6 py-2 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition-colors">
            {t("browse")}
          </div>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileInput}
          />
        </label>
      )}

      {/* Error */}
      {error && (
        <div className="flex gap-3 items-start bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">{t("error")}</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Summary */}
      {parsed && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl p-4">
            <FileText className="w-5 h-5" />
            <span className="font-medium">
              {locale === "he" ? "הקובץ נטען בהצלחה" : "File loaded successfully"}
            </span>
          </div>

          {/* Metadata */}
          {(parsed.customerName || parsed.meterNumber) && (
            <div className="text-sm text-gray-500 flex gap-4 flex-wrap">
              {parsed.customerName && (
                <span>
                  {t("customer")}: <span className="text-gray-800 font-medium">{parsed.customerName}</span>
                </span>
              )}
              {parsed.meterNumber && (
                <span>
                  {t("meter")}: <span className="text-gray-800 font-medium">{parsed.meterNumber}</span>
                </span>
              )}
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label={t("dateRange")}
              value={`${formatDate(parsed.startDate)} – ${formatDate(parsed.endDate)}`}
              small
            />
            <StatCard
              label={t("totalKwh")}
              value={formatKwh(parsed.totalKwh)}
            />
            <StatCard
              label={t("avgDaily")}
              value={formatKwh(parsed.totalKwh / parsed.dataDays)}
            />
            <StatCard
              label={t("days")}
              value={parsed.dataDays.toString()}
            />
          </div>

          {/* Heatmap toggle */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowHeatmap((v) => !v)}
              className="w-full flex items-center justify-between p-4 text-start hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900">{t("heatmap")}</p>
                <p className="text-sm text-gray-500">{t("heatmapDesc")}</p>
              </div>
              {showHeatmap ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {showHeatmap && (
              <div className="px-4 pb-4">
                <ConsumptionHeatmap records={parsed.records} locale={locale} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => onComplete(parsed)}
              className="flex-1 sm:flex-none px-8 py-3 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 transition-colors"
            >
              {t("continue")}
            </button>
            <button
              onClick={() => { setParsed(null); setError(null); }}
              className="px-8 py-3 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors"
            >
              {locale === "he" ? "החלף קובץ" : "Change File"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-semibold text-gray-900 ${small ? "text-sm" : "text-lg"}`}>{value}</p>
    </div>
  );
}
