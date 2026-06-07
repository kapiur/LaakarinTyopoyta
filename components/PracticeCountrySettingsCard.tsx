"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe, Loader2, Save } from "lucide-react";
import { useI18n } from "../lib/useI18n";

type UiLang = "fi" | "ru" | "en";

type PracticeCountryCode = "FI" | "RU";

type PracticeCountry = {
  code: PracticeCountryCode;
  name: Record<UiLang, string>;
  defaultUiLanguage: "fi" | "ru" | "en";
  defaultClinicalCountry: "FI" | "RU";
  defaultClinicalOutputLanguage: string;
  defaultEvidenceStrictness: "strict" | "balanced" | "local-aware";
};

type WorkspaceContextSettings = {
  practiceCountry: PracticeCountryCode;
  usePracticeCountryDefaults: boolean;
  uiLanguage: "fi" | "ru" | "en";
  clinicalCountry: "FI" | "RU";
  clinicalOutputLanguage: string;
  evidenceStrictness: "strict" | "balanced" | "local-aware";
};

const labels = {
  fi: {
    title: "Työskentelymaa",
    description: "Määrittää oman kliinisen työympäristösi oletukset. Maa voi asettaa käyttöliittymän kielen, kliinisen maan ja kliinisten vastausten kielen valmiiksi.",
    country: "Työskentelymaa",
    useDefaults: "Käytä maan oletuksia käyttöliittymässä ja kliinisissä asetuksissa",
    useDefaultsHelp: "Kun tämä on päällä, maa päivittää oletuksena käyttöliittymän kielen sekä kliinisen maan ja kliinisten vastausten kielen. Alla olevia asetuksia voi silti muuttaa erikseen.",
    recommended: "Suositellut oletukset",
    uiLanguage: "Käyttöliittymä",
    clinicalCountry: "Kliininen maa",
    clinicalLanguage: "Kliinisen tekstin kieli",
    mode: "Lähdetila",
    save: "Tallenna työympäristö",
    saved: "Työympäristö tallennettu.",
    failed: "Työympäristön tallennus epäonnistui.",
    overrideNotice: "Sinulla on käytössä omat yliajot. Maa toimii lähtökohtana, mutta kieli- ja kliiniset asetukset voivat poiketa siitä.",
  },
  ru: {
    title: "Страна работы",
    description: "Задает базовый клинический контекст. Страна может автоматически выставить язык интерфейса, клиническую страну и язык клинических ответов.",
    country: "Страна работы",
    useDefaults: "Использовать рекомендуемые значения страны для интерфейса и клинических настроек",
    useDefaultsHelp: "Если включено, страна по умолчанию обновляет язык интерфейса, клиническую страну и язык клинических ответов. Эти параметры все равно можно изменить ниже вручную.",
    recommended: "Рекомендуемые значения",
    uiLanguage: "Интерфейс",
    clinicalCountry: "Клиническая страна",
    clinicalLanguage: "Язык клинического текста",
    mode: "Режим источников",
    save: "Сохранить рабочий контекст",
    saved: "Рабочий контекст сохранен.",
    failed: "Не удалось сохранить рабочий контекст.",
    overrideNotice: "Сейчас используются ручные переопределения. Страна задает отправную точку, но языковые и клинические настройки могут отличаться от нее.",
  },
  en: {
    title: "Practice country",
    description: "Defines the default clinical workspace context. The country can prefill interface language, clinical country, and clinical response language.",
    country: "Practice country",
    useDefaults: "Use country defaults for interface and clinical settings",
    useDefaultsHelp: "When enabled, the selected country updates the default interface language, clinical country, and clinical response language. You can still override them below.",
    recommended: "Recommended defaults",
    uiLanguage: "Interface",
    clinicalCountry: "Clinical country",
    clinicalLanguage: "Clinical text language",
    mode: "Evidence mode",
    save: "Save workspace context",
    saved: "Workspace context saved.",
    failed: "Could not save workspace context.",
    overrideNotice: "Manual overrides are currently active. The country remains your starting context, but language and clinical settings may differ from it.",
  },
} as const;

export default function PracticeCountrySettingsCard() {
  const { language, setLanguage } = useI18n();
  const lang: UiLang = ["fi", "ru", "en"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const l = labels[lang];
  const [settings, setSettings] = useState<WorkspaceContextSettings | null>(null);
  const [countries, setCountries] = useState<PracticeCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.code === settings?.practiceCountry) ?? null,
    [countries, settings?.practiceCountry]
  );

  async function loadContext() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/workspace-context");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || l.failed);
      setSettings(data.settings);
      setCountries(Array.isArray(data.countries) ? data.countries : []);
    } catch (error) {
      console.error(error);
      setMessage(l.failed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveContext(nextSettings = settings) {
    if (!nextSettings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/workspace-context", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || l.failed);
      setSettings(data.settings);
      setLanguage(data.settings.uiLanguage);
      window.dispatchEvent(new CustomEvent("workspace-context-updated", { detail: data.settings }));
      setMessage(l.saved);
      window.setTimeout(() => {
        window.location.reload();
      }, 150);
    } catch (error) {
      console.error(error);
      setMessage(l.failed);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex items-center gap-3 text-slate-500">
        <Loader2 className="animate-spin" size={18} />
        <span className="text-sm font-semibold">Loading workspace context...</span>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Globe size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{l.title}</h2>
          <p className="text-sm text-slate-500">{l.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4">
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{l.country}</span>
          <select
            value={settings.practiceCountry}
            onChange={(event) => setSettings({ ...settings, practiceCountry: event.target.value as PracticeCountryCode })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            {countries.map((country) => (
              <option key={country.code} value={country.code}>{country.name[lang] || country.name.en}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{l.useDefaults}</span>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={settings.usePracticeCountryDefaults}
              onChange={(event) => setSettings({ ...settings, usePracticeCountryDefaults: event.target.checked })}
              className="mt-1"
            />
            <p className="text-sm text-slate-600 leading-relaxed">{l.useDefaultsHelp}</p>
          </div>
        </label>
      </div>

      {selectedCountry && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{l.recommended}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{l.uiLanguage}</div>
              <div className="font-semibold text-slate-800">{selectedCountry.defaultUiLanguage}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{l.clinicalCountry}</div>
              <div className="font-semibold text-slate-800">{selectedCountry.defaultClinicalCountry}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{l.clinicalLanguage}</div>
              <div className="font-semibold text-slate-800">{selectedCountry.defaultClinicalOutputLanguage}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{l.mode}</div>
              <div className="font-semibold text-slate-800">{selectedCountry.defaultEvidenceStrictness}</div>
            </div>
          </div>
        </div>
      )}

      {!settings.usePracticeCountryDefaults && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {l.overrideNotice}
        </div>
      )}

      <button
        onClick={() => saveContext()}
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {l.save}
      </button>

      {message && <p className={`text-sm font-semibold ${message === l.saved ? "text-emerald-700" : "text-red-600"}`}>{message}</p>}
    </section>
  );
}
