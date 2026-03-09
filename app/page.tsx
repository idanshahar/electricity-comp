import { getLocale, getTranslations } from "next-intl/server";
import WizardClient from "@/components/WizardClient";
import LanguageToggle from "@/components/LanguageToggle";

export default async function Home() {
  const locale = (await getLocale()) as "he" | "en";
  const t = await getTranslations();

  const stepLabels = {
    upload: t("steps.upload"),
    select: t("steps.select"),
    results: t("steps.results"),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">⚡</span>
            </div>
            <span className="font-bold text-gray-900 text-sm sm:text-base">
              {t("app.title")}
            </span>
          </div>
          <LanguageToggle locale={locale} />
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            {t("app.title")}
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            {t("app.subtitle")}
          </p>
        </div>

        {/* Wizard */}
        <WizardClient locale={locale} stepLabels={stepLabels} />
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 text-center text-xs text-gray-400">
          {t("app.disclaimer")}
        </div>
      </footer>
    </div>
  );
}
