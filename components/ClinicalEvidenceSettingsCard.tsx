"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe2, Loader2, Save, ShieldCheck } from "lucide-react";
import { useI18n } from "../lib/useI18n";

type ClinicalCountry = {
  code: "FI" | "RU";
  name: Record<"fi" | "ru" | "en", string>;
  defaultClinicalOutputLanguage: string;
  supportedClinicalOutputLanguages: string[];
  defaultEvidenceStrictness: "strict" | "balanced" | "local-aware";
};

type EvidenceStrictness = "strict" | "balanced" | "local-aware";

type ClinicalSettings = {
  practiceCountry?: "FI" | "RU";
  usePracticeCountryDefaults?: boolean;
  clinicalCountry: "FI" | "RU";
  clinicalOutputLanguage: string;
  evidenceStrictness: EvidenceStrictness;
  allowLocalSources: boolean;
  allowSupplementarySources: boolean;
};

type ClinicalSource = {
  id: string;
  country: string;
  name: string;
  description?: string | null;
  sourceType: string;
  trustLevel: string;
  baseUrl?: string | null;
  isOfficial: boolean;
  isEnabled: boolean;
  useForAgent: boolean;
  useForPikaohjeet: boolean;
  useForPatientInstructions: boolean;
};

const labels = {
  fi: {
    title: "Kliiniset lähteet ja maa",
    description: "Valitse, minkä maan virallisiin lähteisiin AI-agentti perustaa kliiniset vastaukset.",
    country: "Kliininen maa",
    clinicalLanguage: "Kliinisen tekstin kieli",
    strictness: "Miten tiukasti lähteitä käytetään",
    fromCountry: "Maan oletus käytössä",
    custom: "Yliajettu käsin",
    strictnessHelp: "Suositus: pidä turvallisin tila päällä kliinisessä työssä. Agentti ei saa antaa hoito-ohjeita ilman virallista lähdetukea.",
    allowLocal: "Salli paikalliset ohjeet",
    allowSupplementary: "Salli täydentävät lähteet",
    save: "Tallenna kliiniset asetukset",
    sources: "Käytettävät lähteet",
    saved: "Tallennettu",
    failed: "Tallennus epäonnistui",
    sourceHelp: "Käyttäjä voi kytkeä lähteitä pois. Lähteen luottamustason määrittää ylläpitäjä.",
    agent: "Agentti",
    pikaohjeet: "Pikaohjeet",
    patientInstructions: "Potilasohjeet",
    enabled: "Käytössä",
    warning: "Jos virallisia lähteitä ei ole käytössä, agentti ei anna kliinisiä suosituksia.",
    evidenceModes: {
      strict: {
        label: "Vain viralliset suositukset",
        description: "Turvallisin tila. Agentti käyttää kliinisissä suosituksissa vain valitun maan virallisia lähteitä.",
      },
      balanced: {
        label: "Viralliset + luotettavat viitelähteet",
        description: "Sallii virallisten suositusten lisäksi luotettavat lääketieteelliset viitelähteet, mutta ei korvaa suosituksia niillä.",
      },
      "local-aware": {
        label: "Viralliset + paikalliset ohjeet",
        description: "Huomioi myös paikalliset hoitopolut ja organisaatio-ohjeet, jos ne on otettu käyttöön.",
      },
    },
  },
  ru: {
    title: "Клинические источники и страна",
    description: "Выберите, на официальные источники какой страны AI-агент должен опираться в клинических ответах.",
    country: "Страна рекомендаций",
    clinicalLanguage: "Язык клинического текста",
    strictness: "Как строго использовать источники",
    fromCountry: "По умолчанию от страны работы",
    custom: "Переопределено вручную",
    strictnessHelp: "Рекомендация: для клинической работы оставлять самый безопасный режим. Агент не должен давать лечебные рекомендации без официального источника.",
    allowLocal: "Разрешить локальные инструкции",
    allowSupplementary: "Разрешить дополнительные источники",
    save: "Сохранить клинические настройки",
    sources: "Используемые источники",
    saved: "Сохранено",
    failed: "Не удалось сохранить",
    sourceHelp: "Пользователь может отключать источники. Уровень доверия источника задаёт администратор.",
    agent: "Агент",
    pikaohjeet: "Pikaohjeet",
    patientInstructions: "Инструкции пациенту",
    enabled: "Включён",
    warning: "Если официальные источники отключены, агент не будет давать клинические рекомендации.",
    evidenceModes: {
      strict: {
        label: "Только официальные рекомендации",
        description: "Самый безопасный режим. Для клинических рекомендаций агент использует только официальные источники выбранной страны.",
      },
      balanced: {
        label: "Официальные + надёжные справочники",
        description: "Разрешает использовать надёжные медицинские справочники вместе с официальными рекомендациями, но не вместо них.",
      },
      "local-aware": {
        label: "Официальные + локальные инструкции",
        description: "Учитывает также локальные протоколы и инструкции организации, если они включены.",
      },
    },
  },
  en: {
    title: "Clinical sources and country",
    description: "Choose which country's official sources the AI agent should use for clinical answers.",
    country: "Clinical country",
    clinicalLanguage: "Clinical text language",
    strictness: "How strictly sources are used",
    fromCountry: "Using practice-country default",
    custom: "Manually overridden",
    strictnessHelp: "Recommended: keep the safest mode for clinical work. The agent must not provide treatment recommendations without official source support.",
    allowLocal: "Allow local instructions",
    allowSupplementary: "Allow supplementary sources",
    save: "Save clinical settings",
    sources: "Sources in use",
    saved: "Saved",
    failed: "Save failed",
    sourceHelp: "Users can disable sources. Trust level is controlled by an administrator.",
    agent: "Agent",
    pikaohjeet: "Quick guides",
    patientInstructions: "Patient instructions",
    enabled: "Enabled",
    warning: "If no official sources are enabled, the agent will not provide clinical recommendations.",
    evidenceModes: {
      strict: {
        label: "Official guidelines only",
        description: "Safest mode. The agent uses only official sources from the selected country for clinical recommendations.",
      },
      balanced: {
        label: "Official + trusted references",
        description: "Allows trusted medical references together with official guidelines, but not as a replacement for them.",
      },
      "local-aware": {
        label: "Official + local instructions",
        description: "Also considers local care pathways and organization instructions when enabled.",
      },
    },
  },
} as const;

const evidenceModeOrder: EvidenceStrictness[] = ["strict", "balanced", "local-aware"];

export default function ClinicalEvidenceSettingsCard() {
  const { language } = useI18n();
  const l = labels[language] || labels.fi;
  const [settings, setSettings] = useState<ClinicalSettings | null>(null);
  const [countries, setCountries] = useState<ClinicalCountry[]>([]);
  const [sources, setSources] = useState<ClinicalSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCountry = useMemo(() => countries.find((country) => country.code === settings?.clinicalCountry), [countries, settings?.clinicalCountry]);
  const selectedEvidenceMode = settings ? l.evidenceModes[settings.evidenceStrictness] : null;
  const followsCountryDefaults =
    !!settings?.usePracticeCountryDefaults &&
    !!selectedCountry &&
    settings.clinicalCountry === selectedCountry.code &&
    settings.clinicalOutputLanguage === selectedCountry.defaultClinicalOutputLanguage &&
    settings.evidenceStrictness === selectedCountry.defaultEvidenceStrictness;

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/clinical-settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      setSettings(data.settings);
      setCountries(data.countries || []);
      await loadSources(data.settings.clinicalCountry);
    } catch (error) {
      setMessage(l.failed);
    } finally {
      setLoading(false);
    }
  }

  async function loadSources(country: string) {
    const res = await fetch(`/api/profile/clinical-sources?country=${encodeURIComponent(country)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Load failed");
    setSources(data.sources || []);
  }

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleWorkspaceContextUpdated() {
      loadSettings();
    }

    window.addEventListener("workspace-context-updated", handleWorkspaceContextUpdated);
    return () => {
      window.removeEventListener("workspace-context-updated", handleWorkspaceContextUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSettings(nextSettings = settings) {
    if (!nextSettings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/clinical-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || l.failed);
      setMessage(l.saved);
      await loadSources(nextSettings.clinicalCountry);
    } catch (error) {
      setMessage(l.failed);
    } finally {
      setSaving(false);
    }
  }

  async function updateSource(source: ClinicalSource, patch: Partial<ClinicalSource>) {
    const next = { ...source, ...patch };
    setSources((current) => current.map((item) => item.id === source.id ? next : item));
    setMessage(null);
    try {
      const res = await fetch("/api/profile/clinical-sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: next.id,
          isEnabled: next.isEnabled,
          useForAgent: next.useForAgent,
          useForPikaohjeet: next.useForPikaohjeet,
          useForPatientInstructions: next.useForPatientInstructions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || l.failed);
      setMessage(l.saved);
    } catch (error) {
      setMessage(l.failed);
      await loadSources(settings?.clinicalCountry || "FI");
    }
  }

  if (loading || !settings) {
    return (
      <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex items-center gap-3 text-slate-500">
        <Loader2 className="animate-spin" size={18} />
        <span className="text-sm font-semibold">Loading clinical source settings...</span>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Globe2 size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{l.title}</h2>
          <p className="text-sm text-slate-500">{l.description}</p>
          <div className="mt-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${
                followsCountryDefaults
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {followsCountryDefaults ? l.fromCountry : l.custom}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{l.country}</span>
          <select
            value={settings.clinicalCountry}
            onChange={async (event) => {
              const country = countries.find((item) => item.code === event.target.value);
              const next = {
                ...settings,
                clinicalCountry: event.target.value as "FI" | "RU",
                clinicalOutputLanguage: country?.defaultClinicalOutputLanguage || settings.clinicalOutputLanguage,
                evidenceStrictness: country?.defaultEvidenceStrictness || settings.evidenceStrictness,
              };
              setSettings(next);
              await saveSettings(next);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            {countries.map((country) => (
              <option key={country.code} value={country.code}>{country.name[language] || country.name.en}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{l.clinicalLanguage}</span>
          <select
            value={settings.clinicalOutputLanguage}
            onChange={(event) => setSettings({ ...settings, clinicalOutputLanguage: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            {(selectedCountry?.supportedClinicalOutputLanguages || [settings.clinicalOutputLanguage]).map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{l.strictness}</span>
          <select
            value={settings.evidenceStrictness}
            onChange={(event) => setSettings({ ...settings, evidenceStrictness: event.target.value as EvidenceStrictness })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            {evidenceModeOrder.map((mode) => (
              <option key={mode} value={mode}>{l.evidenceModes[mode].label}</option>
            ))}
          </select>
          {selectedEvidenceMode && (
            <p className="text-xs text-slate-500 leading-relaxed">{selectedEvidenceMode.description}</p>
          )}
        </label>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">{l.strictnessHelp}</p>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2 font-semibold text-slate-600">
          <input type="checkbox" checked={settings.allowLocalSources} onChange={(event) => setSettings({ ...settings, allowLocalSources: event.target.checked })} />
          {l.allowLocal}
        </label>
        <label className="inline-flex items-center gap-2 font-semibold text-slate-600">
          <input type="checkbox" checked={settings.allowSupplementarySources} onChange={(event) => setSettings({ ...settings, allowSupplementarySources: event.target.checked })} />
          {l.allowSupplementary}
        </label>
      </div>

      <button
        onClick={() => saveSettings()}
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {l.save}
      </button>

      {message && <p className="text-sm font-semibold text-emerald-700">{message}</p>}

      <div className="rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 p-4 text-sm font-semibold">
        {l.warning}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-600" />
          <h3 className="font-bold text-slate-900">{l.sources}</h3>
        </div>
        <p className="text-xs text-slate-500">{l.sourceHelp}</p>

        <div className="space-y-3">
          {sources.map((source) => (
            <div key={source.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-slate-900">{source.name}</h4>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-500 font-bold">{source.trustLevel}</span>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-500 font-bold">{source.sourceType}</span>
                  </div>
                  {source.description && <p className="text-xs text-slate-500 mt-1">{source.description}</p>}
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={source.isEnabled} onChange={(event) => updateSource(source, { isEnabled: event.target.checked })} />
                  {l.enabled}
                </label>
              </div>

              <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={source.useForAgent} disabled={!source.isEnabled} onChange={(event) => updateSource(source, { useForAgent: event.target.checked })} />
                  {l.agent}
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={source.useForPikaohjeet} disabled={!source.isEnabled} onChange={(event) => updateSource(source, { useForPikaohjeet: event.target.checked })} />
                  {l.pikaohjeet}
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={source.useForPatientInstructions} disabled={!source.isEnabled} onChange={(event) => updateSource(source, { useForPatientInstructions: event.target.checked })} />
                  {l.patientInstructions}
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
