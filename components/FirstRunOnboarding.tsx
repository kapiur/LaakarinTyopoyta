"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Calculator,
  CheckCircle2,
  FileSearch,
  FileText,
  Globe,
  Layers3,
  Loader2,
  Sparkles,
} from "lucide-react";
import { getLocalizedText, type UiLanguage } from "../lib/i18n";
import type { PracticeCountryCode, PracticeCountryDefaults } from "../lib/clinical/practice/practiceCountryRegistry";
import { useI18n } from "../lib/useI18n";

type StarterTarget = "home" | "text" | "guides" | "literature" | "calculators" | "templates";

type OnboardingSettings = {
  practiceCountry: PracticeCountryCode;
  usePracticeCountryDefaults: boolean;
  uiLanguage: UiLanguage;
};

type OnboardingAiProfile = {
  role: string;
  specialty: string;
  workplace: string;
  experienceLevel: string;
  defaultClinicalContext: string;
  preferredStructure: string;
  useProfileByDefault: boolean;
};

export type OnboardingSnapshot = {
  settings: OnboardingSettings;
  aiProfile: OnboardingAiProfile;
  countries: PracticeCountryDefaults[];
  interfaceLanguages: Array<{ code: UiLanguage; nativeName: string }>;
};

const STARTER_TARGETS: StarterTarget[] = ["text", "guides", "literature", "calculators", "templates", "home"];

export default function FirstRunOnboarding({
  snapshot,
  onCompleted,
}: {
  snapshot: OnboardingSnapshot;
  onCompleted: (redirectPath: string) => void;
}) {
  const { language, setLanguage, t } = useI18n();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<OnboardingSettings>(snapshot.settings);
  const [profile, setProfile] = useState<OnboardingAiProfile>(snapshot.aiProfile);
  const [starterTarget, setStarterTarget] = useState<StarterTarget>("text");

  const selectedCountry = useMemo(
    () => snapshot.countries.find((country) => country.code === form.practiceCountry) ?? snapshot.countries[0],
    [form.practiceCountry, snapshot.countries]
  );

  const effectiveLanguage = form.usePracticeCountryDefaults
    ? selectedCountry?.defaultUiLanguage ?? form.uiLanguage
    : form.uiLanguage;

  const overviewItems = [
    { key: "text", icon: <Bot size={18} className="text-blue-600" />, title: t("onboarding.nodeTextTitle"), description: t("onboarding.nodeTextDescription") },
    { key: "guides", icon: <Sparkles size={18} className="text-amber-500" />, title: t("onboarding.nodeGuidesTitle"), description: t("onboarding.nodeGuidesDescription") },
    { key: "literature", icon: <FileSearch size={18} className="text-emerald-600" />, title: t("onboarding.nodeLiteratureTitle"), description: t("onboarding.nodeLiteratureDescription") },
    { key: "calculators", icon: <Calculator size={18} className="text-indigo-600" />, title: t("onboarding.nodeCalculatorsTitle"), description: t("onboarding.nodeCalculatorsDescription") },
    { key: "templates", icon: <FileText size={18} className="text-rose-600" />, title: t("onboarding.nodeTemplatesTitle"), description: t("onboarding.nodeTemplatesDescription") },
  ];

  const importantItems = [
    {
      key: "dosing",
      icon: <Calculator size={18} className="text-indigo-600" />,
      title: t("onboarding.helpDosingTitle"),
      description: t("onboarding.helpDosingDescription"),
      hint: t("onboarding.helpDosingHint"),
    },
    {
      key: "templates",
      icon: <FileText size={18} className="text-rose-600" />,
      title: t("onboarding.helpTemplatesTitle"),
      description: t("onboarding.helpTemplatesDescription"),
      hint: t("onboarding.helpTemplatesHint"),
    },
    {
      key: "literature",
      icon: <FileSearch size={18} className="text-emerald-600" />,
      title: t("onboarding.helpLiteratureTitle"),
      description: t("onboarding.helpLiteratureDescription"),
      hint: t("onboarding.helpLiteratureHint"),
    },
  ];

  const profileFields: Array<{ key: keyof OnboardingAiProfile; label: string; placeholder: string }> = [
    { key: "role", label: t("onboarding.profileRoleLabel"), placeholder: t("onboarding.profileRolePlaceholder") },
    { key: "specialty", label: t("onboarding.profileSpecialtyLabel"), placeholder: t("onboarding.profileSpecialtyPlaceholder") },
    { key: "workplace", label: t("onboarding.profileWorkplaceLabel"), placeholder: t("onboarding.profileWorkplacePlaceholder") },
    { key: "experienceLevel", label: t("onboarding.profileExperienceLabel"), placeholder: t("onboarding.profileExperiencePlaceholder") },
    { key: "defaultClinicalContext", label: t("onboarding.profileContextLabel"), placeholder: t("onboarding.profileContextPlaceholder") },
    { key: "preferredStructure", label: t("onboarding.profileStructureLabel"), placeholder: t("onboarding.profileStructurePlaceholder") },
  ];

  const starterOptions: Array<{ key: StarterTarget; title: string; description: string }> = [
    { key: "text", title: t("onboarding.startText"), description: t("onboarding.nodeTextDescription") },
    { key: "guides", title: t("onboarding.startGuides"), description: t("onboarding.nodeGuidesDescription") },
    { key: "literature", title: t("onboarding.startLiterature"), description: t("onboarding.nodeLiteratureDescription") },
    { key: "calculators", title: t("onboarding.startCalculators"), description: t("onboarding.nodeCalculatorsDescription") },
    { key: "templates", title: t("onboarding.startTemplates"), description: t("onboarding.nodeTemplatesDescription") },
    { key: "home", title: t("onboarding.startHome"), description: t("dashboard.title") },
  ];

  async function finishOnboarding() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practiceCountry: form.practiceCountry,
          usePracticeCountryDefaults: form.usePracticeCountryDefaults,
          uiLanguage: effectiveLanguage,
          aiProfile: profile,
          starterTarget,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("onboarding.saveFailed"));

      setLanguage(data.settings.uiLanguage as UiLanguage);
      onCompleted(data.redirectPath || "/");
    } catch (err: any) {
      setError(err.message || t("onboarding.saveFailed"));
      setSaving(false);
    }
  }

  const stepLabels = [
    t("onboarding.stepWelcome"),
    t("onboarding.stepContext"),
    t("onboarding.stepProfile"),
    t("onboarding.stepStart"),
  ];

  function updateProfileField(key: keyof OnboardingAiProfile, value: string | boolean) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
            <Layers3 size={14} />
            {t("onboarding.title")}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{t("onboarding.title")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{t("onboarding.subtitle")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid-cols-4">
          {stepLabels.map((label, index) => (
            <div
              key={label}
              className={`rounded-2xl border px-3 py-3 text-center ${
                index === step
                  ? "border-slate-900 bg-slate-900 text-white"
                  : index < step
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-400"
              }`}
            >
              <div className="mb-1 text-[10px]">{index + 1}</div>
              <div className="normal-case tracking-normal">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                  <Globe size={14} />
                  {t("onboarding.stepWelcome")}
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">{t("onboarding.systemTitle")}</h2>
                <p className="max-w-2xl text-sm leading-7 text-slate-600">{t("onboarding.systemDescription")}</p>
              </div>

              <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="mt-0.5 text-blue-600" />
                  <div>
                    <h3 className="font-bold text-slate-900">{t("onboarding.nodesTitle")}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{t("onboarding.finishNote")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {overviewItems.map((item) => (
                <div key={item.key} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50">{item.icon}</div>
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                  </div>
                  <p className="text-sm leading-6 text-slate-500">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-black tracking-tight text-slate-900">{t("onboarding.helpTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t("onboarding.helpDescription")}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {importantItems.map((item) => (
                <div key={item.key} className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50">{item.icon}</div>
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                  <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{item.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">{t("onboarding.stepContext")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t("onboarding.useDefaultsHelp")}</p>
            </div>

            <div className="grid gap-5">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("onboarding.countryLabel")}</span>
                <select
                  value={form.practiceCountry}
                  onChange={(event) => setForm({ ...form, practiceCountry: event.target.value as PracticeCountryCode })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                >
                  {snapshot.countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {getLocalizedText(country.name, language)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("onboarding.languageLabel")}</span>
                <select
                  value={effectiveLanguage}
                  disabled={form.usePracticeCountryDefaults}
                  onChange={(event) => setForm({ ...form, uiLanguage: event.target.value as UiLanguage })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {snapshot.interfaceLanguages.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.nativeName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-start gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={form.usePracticeCountryDefaults}
                  onChange={(event) => setForm({ ...form, usePracticeCountryDefaults: event.target.checked })}
                />
                <div>
                  <div className="text-sm font-bold text-slate-900">{t("onboarding.useDefaults")}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{t("onboarding.useDefaultsHelp")}</p>
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("settings.languageTitle")}</div>
            <div className="mt-4 grid gap-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("onboarding.countryLabel")}</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{selectedCountry ? getLocalizedText(selectedCountry.name, language) : form.practiceCountry}</div>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("onboarding.languageLabel")}</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{snapshot.interfaceLanguages.find((item) => item.code === effectiveLanguage)?.nativeName ?? effectiveLanguage}</div>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("onboarding.useDefaults")}</div>
                <div className="mt-1 text-sm font-semibold text-slate-700">
                  {form.usePracticeCountryDefaults ? t("settings.languageDescription") : t("onboarding.finishNote")}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">{t("onboarding.stepProfile")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t("onboarding.profileDescription")}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {profileFields.map((field) => (
                <label key={field.key} className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{field.label}</span>
                  <input
                    value={typeof profile[field.key] === "string" ? profile[field.key] as string : ""}
                    onChange={(event) => updateProfileField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t("onboarding.profilePreviewTitle")}</div>
            <div className="grid gap-4">
              {profileFields.map((field) => {
                const currentValue = typeof profile[field.key] === "string" ? profile[field.key] as string : "";
                return (
                  <div key={field.key} className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{field.label}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-700">
                      {currentValue || t("onboarding.profileOptional")}
                    </div>
                  </div>
                );
              })}
              <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4">
                <div className="text-sm font-bold text-slate-900">{t("onboarding.profileNoteTitle")}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("onboarding.profileNoteDescription")}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">{t("onboarding.stepStart")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{t("onboarding.startLabel")}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {starterOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setStarterTarget(option.key)}
                className={`rounded-[1.5rem] border p-5 text-left transition ${
                  starterTarget === option.key
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-bold text-slate-900">{option.title}</span>
                  {starterTarget === option.key && <CheckCircle2 size={18} className="text-blue-600" />}
                </div>
                <p className="text-sm leading-6 text-slate-500">{option.description}</p>
              </button>
            ))}
          </div>

          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-slate-500">{t("onboarding.finishNote")}</p>

        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              {t("onboarding.back")}
            </button>
          )}

          {step < stepLabels.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((current) => Math.min(stepLabels.length - 1, current + 1))}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              {t("onboarding.next")}
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={finishOnboarding}
              disabled={saving || !STARTER_TARGETS.includes(starterTarget)}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {saving ? t("onboarding.saving") : t("onboarding.finish")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
