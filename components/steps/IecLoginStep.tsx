"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Zap, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import type { ParsedCSV, ConsumptionRecord } from "@/lib/types";

interface Props {
  onComplete: (data: ParsedCSV) => void;
  locale: "he" | "en";
}

type Phase =
  | { name: "idle" }
  | { name: "sendingOtp"; israeliId: string }
  | { name: "enteringOtp"; israeliId: string; factorHint?: string }
  | { name: "verifyingOtp" }
  | { name: "fetching" }
  | { name: "error"; message: string; canRetry: boolean };

// Re-hydrate ISO string dates back to Date objects
interface SerializedRecord {
  datetime: string;
  dayOfWeek: number;
  hour: number;
  minute: number;
  isWeekend: boolean;
  kwh: number;
}

interface SerializedParsedCSV {
  records: SerializedRecord[];
  totalKwh: number;
  dataDays: number;
  startDate: string;
  endDate: string;
  customerName?: string;
  meterNumber?: string;
}

function hydrateRecords(serialized: SerializedParsedCSV): ParsedCSV {
  const records: ConsumptionRecord[] = serialized.records.map((r) => ({
    ...r,
    datetime: new Date(r.datetime),
  }));
  return {
    ...serialized,
    records,
    startDate: new Date(serialized.startDate),
    endDate: new Date(serialized.endDate),
  };
}

export default function IecLoginStep({ onComplete, locale }: Props) {
  const t = useTranslations("iecLogin");
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [israeliId, setIsraeliId] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const handleSendOtp = async () => {
    const trimmed = israeliId.trim();
    if (!/^\d{9}$/.test(trimmed)) return;

    setPhase({ name: "sendingOtp", israeliId: trimmed });

    try {
      const res = await fetch("/api/iec/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ israeliId: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Login failed");
      setOtpCode("");
      setPhase({ name: "enteringOtp", israeliId: trimmed });
    } catch (err) {
      setPhase({
        name: "error",
        message: err instanceof Error ? err.message : String(err),
        canRetry: true,
      });
    }
  };

  const handleVerifyOtp = async () => {
    const trimmed = otpCode.trim();
    if (!trimmed) return;

    setPhase({ name: "verifyingOtp" });

    try {
      const res = await fetch("/api/iec/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpCode: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Verification failed");

      // OTP verified — now fetch consumption
      setPhase({ name: "fetching" });
      await fetchConsumption();
    } catch (err) {
      setPhase({
        name: "error",
        message: err instanceof Error ? err.message : String(err),
        canRetry: true,
      });
    }
  };

  const fetchConsumption = async () => {
    try {
      const res = await fetch("/api/iec/consumption");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch data");

      const parsedCSV = hydrateRecords(json as SerializedParsedCSV);
      onComplete(parsedCSV);
    } catch (err) {
      setPhase({
        name: "error",
        message: err instanceof Error ? err.message : String(err),
        canRetry: false,
      });
    }
  };

  const reset = () => {
    setPhase({ name: "idle" });
    setIsraeliId("");
    setOtpCode("");
  };

  const isLoading =
    phase.name === "sendingOtp" ||
    phase.name === "verifyingOtp" ||
    phase.name === "fetching";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t("title")}</h2>
        <p className="text-gray-500 mt-1">{t("description")}</p>
      </div>

      {/* Privacy note */}
      <div className="flex gap-3 items-start bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p>{t("privacyNote")}</p>
      </div>

      {/* Error */}
      {phase.name === "error" && (
        <div className="flex gap-3 items-start bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-800">{t("errorTitle")}</p>
            <p className="text-red-600 text-sm mt-1">{phase.message}</p>
            <div className="flex gap-3 mt-3">
              {phase.canRetry && (
                <button
                  onClick={reset}
                  className="text-sm px-4 py-1.5 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                >
                  {t("tryAgain")}
                </button>
              )}
              <button
                onClick={reset}
                className="text-sm text-red-500 hover:text-red-700 underline"
              >
                {locale === "he" ? "התחל מחדש" : "Start over"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Israeli ID input */}
      {(phase.name === "idle" || phase.name === "sendingOtp") && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t("idLabel")}
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{9}"
              maxLength={9}
              value={israeliId}
              onChange={(e) => setIsraeliId(e.target.value.replace(/\D/g, ""))}
              placeholder={t("idPlaceholder")}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 text-lg tracking-widest"
            />
            {israeliId.length > 0 && israeliId.length < 9 && (
              <p className="text-xs text-gray-400 mt-1">
                {9 - israeliId.length}{" "}
                {locale === "he" ? "ספרות נוספות" : "more digits needed"}
              </p>
            )}
          </div>

          <button
            onClick={handleSendOtp}
            disabled={israeliId.length !== 9 || isLoading}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase.name === "sendingOtp" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {locale === "he" ? "שולח קוד..." : "Sending code..."}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                {t("sendCode")}
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 2: OTP input */}
      {(phase.name === "enteringOtp" || phase.name === "verifyingOtp") && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
            {locale === "he"
              ? `קוד אימות נשלח לטלפון/אימייל הרשום של מספר ת.ז. ${phase.name === "enteringOtp" ? phase.israeliId : ""}`
              : `A verification code was sent to the phone/email registered for ID ${phase.name === "enteringOtp" ? phase.israeliId : ""}`}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t("otpLabel")}
            </label>
            <p className="text-sm text-gray-500 mb-2">{t("otpDescription")}</p>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={8}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              placeholder={t("otpPlaceholder")}
              disabled={phase.name === "verifyingOtp"}
              autoFocus
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 text-xl tracking-widest"
            />
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            <button
              onClick={handleVerifyOtp}
              disabled={otpCode.length < 4 || phase.name === "verifyingOtp"}
              className="flex items-center gap-2 px-8 py-3 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phase.name === "verifyingOtp" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {locale === "he" ? "מאמת..." : "Verifying..."}
                </>
              ) : (
                t("verify")
              )}
            </button>

            <button
              onClick={reset}
              disabled={phase.name === "verifyingOtp"}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              {locale === "he" ? "שנה מספר תעודת זהות" : "Change ID"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Fetching */}
      {phase.name === "fetching" && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-900">{t("fetching")}</p>
            <p className="text-sm text-gray-500 mt-1">{t("fetchingDesc")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
