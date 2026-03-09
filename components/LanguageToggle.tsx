"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface Props {
  locale: "he" | "en";
}

export default function LanguageToggle({ locale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function switchLocale(next: "he" | "en") {
    if (next === locale) return;
    await fetch("/set-locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
      {(["he", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          disabled={isPending}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            locale === l
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {l === "he" ? "עב" : "EN"}
        </button>
      ))}
    </div>
  );
}
