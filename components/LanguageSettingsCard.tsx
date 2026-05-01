"use client";

import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { SUPPORTED_UI_LANGUAGES, type UiLanguage } from "../lib/i18n/config";
import { useI18n } from "../lib/useI18n";

export default function LanguageSettingsCard() {
  const { language, setLanguage, t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveLanguage(nextLanguage: UiLanguage) {
    setSaving(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uiLanguage: nextLanguage }),
      });

      if (!response.ok) {
        throw new Error(t("settings.languageSaveFailed"));
      }

      const data = await response.json();
      setLanguage(data.uiLanguage);
      setStatus(t("settings.languageSaved"));
    } catch (err: any) {
      setError(err.message || t("settings.languageSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Languages size={24} />
        </div>
        <div className="space-y-3 flex-1">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t("settings.languageTitle")}</h2>
            <p className="text-sm text-slate-500">{t("settings.languageDescription")}</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <select
              value={language}
              disabled={saving}
              onChange={(event) => saveLanguage(event.target.value as UiLanguage)}
              className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
            >
              {SUPPORTED_UI_LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>{item.nativeName}</option>
              ))}
            </select>

            {saving && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Loader2 size={14} className="animate-spin" /> {t("common.loading")}
              </span>
            )}
          </div>

          {(status || error) && (
            <p className={`text-xs font-bold ${error ? "text-red-600" : "text-emerald-600"}`}>
              {error || status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
