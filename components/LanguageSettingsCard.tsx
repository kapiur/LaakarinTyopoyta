"use client";

import { useEffect, useMemo, useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { SUPPORTED_UI_LANGUAGES, type UiLanguage } from "../lib/i18n/config";
import { useI18n } from "../lib/useI18n";

type WorkspaceContextSnapshot = {
  usePracticeCountryDefaults: boolean;
  uiLanguage: UiLanguage;
  practiceCountry: "FI" | "RU";
};

export default function LanguageSettingsCard() {
  const { language, setLanguage, t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContextSnapshot | null>(null);

  const overrideStatus = useMemo(() => {
    if (!workspaceContext) return null;
    return workspaceContext.usePracticeCountryDefaults
      ? {
          text: language === "ru" ? "По умолчанию от страны работы" : language === "en" ? "Using practice-country default" : "Työskentelymaan oletus käytössä",
          className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
        }
      : {
          text: language === "ru" ? "Переопределено вручную" : language === "en" ? "Manually overridden" : "Yliajettu käsin",
          className: "border border-amber-200 bg-amber-50 text-amber-800",
        };
  }, [language, workspaceContext]);

  async function loadWorkspaceContext() {
    try {
      const response = await fetch("/api/profile/workspace-context");
      const data = await response.json();
      if (!response.ok) return;
      setWorkspaceContext(data.settings);
    } catch {
      // keep card usable even if context fetch fails
    }
  }

  useEffect(() => {
    loadWorkspaceContext();

    function handleWorkspaceContextUpdated() {
      loadWorkspaceContext();
    }

    window.addEventListener("workspace-context-updated", handleWorkspaceContextUpdated);
    return () => {
      window.removeEventListener("workspace-context-updated", handleWorkspaceContextUpdated);
    };
  }, []);

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
      setWorkspaceContext((current) =>
        current
          ? {
              ...current,
              uiLanguage: data.uiLanguage,
              usePracticeCountryDefaults: false,
            }
          : current
      );
      window.dispatchEvent(new CustomEvent("workspace-context-invalidated"));
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
            {overrideStatus && (
              <div className="mt-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${overrideStatus.className}`}>
                  {overrideStatus.text}
                </span>
              </div>
            )}
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
