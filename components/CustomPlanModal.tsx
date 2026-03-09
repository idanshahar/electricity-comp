"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { DiscountPlan } from "@/lib/types";

interface Props {
  onAdd: (plan: DiscountPlan) => void;
  onClose: () => void;
  locale: "he" | "en";
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function CustomPlanModal({ onAdd, onClose, locale }: Props) {
  const t = useTranslations("custom");

  const [nameHe, setNameHe] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [discount, setDiscount] = useState(10);
  const [allHours, setAllHours] = useState(true);
  const [startHour, setStartHour] = useState(23);
  const [endHour, setEndHour] = useState(7);
  const [selectedDays, setSelectedDays] = useState<number[]>([...ALL_DAYS]);

  const dayKeys = Object.keys(t.raw("daysOptions")) as string[];

  function toggleDay(d: number) {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  function handleAdd() {
    if (!nameHe.trim() && !nameEn.trim()) return;
    const id = `custom-${Date.now()}`;
    const plan: DiscountPlan = {
      id,
      providerId: "custom",
      nameHe: nameHe.trim() || nameEn.trim(),
      nameEn: nameEn.trim() || nameHe.trim(),
      discountPercent: discount,
      window: allHours
        ? null
        : { startHour, endHour, days: selectedDays },
      requiresSmartMeter: !allHours,
      isCustom: true,
    };
    onAdd(plan);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-bold text-gray-900">{t("title")}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {t("nameHe")}
              </label>
              <input
                dir="rtl"
                value={nameHe}
                onChange={(e) => setNameHe(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {t("nameEn")}
              </label>
              <input
                dir="ltr"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              {t("discount")}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={30}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="flex-1 accent-purple-600"
              />
              <span className="w-12 text-center font-bold text-purple-700 text-lg">
                {discount}%
              </span>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allHours}
                onChange={(e) => setAllHours(e.target.checked)}
                className="w-4 h-4 rounded accent-purple-600"
              />
              <span className="text-sm font-medium text-gray-700">{t("allHours")}</span>
            </label>
          </div>

          {!allHours && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    {t("from")}
                  </label>
                  <select
                    value={startHour}
                    onChange={(e) => setStartHour(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    {t("to")}
                  </label>
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">{t("days")}</label>
                <div className="flex gap-2 flex-wrap">
                  {dayKeys.map((dk) => {
                    const d = Number(dk);
                    const active = selectedDays.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          active
                            ? "bg-purple-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {t(`daysOptions.${dk}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={handleAdd}
            disabled={!nameHe.trim() && !nameEn.trim()}
            className="flex-1 py-2.5 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t("add")}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
