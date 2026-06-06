"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Loader2, Save, ShieldCheck, Sparkles } from "lucide-react";
import PrivacyNotice from "./PrivacyNotice";
import { useI18n } from "../lib/useI18n";

type UiLang = "fi" | "ru" | "en";

type AiProfile = {
  role?: string | null;
  specialty?: string | null;
  workplace?: string | null;
  experienceLevel?: string | null;
  defaultClinicalContext?: string | null;
  preferredStructure?: string | null;
  detailLevel?: string | null;
  writingStyle?: string | null;
  permanentInstructions?: string | null;
  avoidInstructions?: string | null;
  styleSummary?: string | null;
  useProfileByDefault?: boolean | null;
};

type PrivacyInfo = {
  anonymized?: boolean;
  findingTypes?: string[];
} | null;

const dict = {
  fi: {
    title: "AI-profiili",
    subtitle: "Mukauta AI-avustajan työskentelyä omaan kliiniseen rooliisi ja kirjoitustyyliisi.",
    enabled: "Käytä AI-profiilia oletuksena",
    role: "Ammattirooli",
    specialty: "Erikoisala / työalue",
    workplace: "Työympäristö",
    experienceLevel: "Kokemustaso",
    defaultClinicalContext: "Oletuskliininen konteksti",
    preferredStructure: "Toivottu tekstirakenne",
    detailLevel: "Yksityiskohtaisuuden taso",
    writingStyle: "Kirjoitustyyli",
    permanentInstructions: "Pysyvät ohjeet AI:lle",
    avoidInstructions: "Mitä AI:n tulee välttää",
    styleSummary: "Tyyliyhteenveto",
    exampleTitle: "Lisää uusi esimerkki kirjoitustyyliin",
    exampleHelp: "Liitä yksi hyvä esimerkkiteksti kerrallaan. Valitse tai kirjoita ensin tekstityyppi, jotta AI erottaa esimerkiksi etäkontaktin, lähetteen ja loppuarvion tyylin. Alkuperäistä tekstiä ei tallenneta.",
    examplePlaceholder: "Liitä yksi vastaanottoteksti, etäkontakti, lähete tai loppuarvio...",
    sourceLabel: "Tekstityyppi / esimerkin nimi",
    sourceLabelPlaceholder: "Esim. Loppuarvio, Lähete, Etäkontakti, Vastaanottokäynti, Väliarvio",
    saveSample: "Tallenna anonymisoitu esimerkki myöhempää tyylin tarkentamista varten (vain jos haluat säilyttää sen)",
    analyze: "Lisää esimerkki tyyliin",
    save: "Tallenna AI-profiili",
    saved: "AI-profiili tallennettu.",
    analyzed: "Tyyliyhteenvetoa täydennetty uudella esimerkillä.",
    error: "Toiminto epäonnistui.",
    loading: "Ladataan...",
    preview: "Anonymisoitu esikatselu",
  },
  ru: {
    title: "AI-профиль",
    subtitle: "Настройте AI-помощника под свою клиническую роль и стиль письма.",
    enabled: "Использовать AI-профиль по умолчанию",
    role: "Профессиональная роль",
    specialty: "Специальность / направление",
    workplace: "Рабочая среда",
    experienceLevel: "Уровень опыта",
    defaultClinicalContext: "Клинический контекст по умолчанию",
    preferredStructure: "Предпочитаемая структура текста",
    detailLevel: "Уровень детализации",
    writingStyle: "Стиль письма",
    permanentInstructions: "Постоянные инструкции для AI",
    avoidInstructions: "Чего AI должен избегать",
    styleSummary: "Краткое описание стиля",
    exampleTitle: "Добавить новый пример к стилю",
    exampleHelp: "Вставляйте один хороший пример за раз. Сначала выберите или напишите тип текста, чтобы AI различал стиль etäkontakti, направления и loppuarvio. Исходный текст не сохраняется.",
    examplePlaceholder: "Вставьте один приём, etäkontakti, направление или loppuarvio...",
    sourceLabel: "Тип текста / название образца",
    sourceLabelPlaceholder: "Например: Loppuarvio, Lähete, Etäkontakti, Vastaanottokäynti, Väliarvio",
    saveSample: "Сохранить анонимизированный пример для дальнейшего уточнения стиля (только если вы хотите его хранить)",
    analyze: "Добавить пример к стилю",
    save: "Сохранить AI-профиль",
    saved: "AI-профиль сохранён.",
    analyzed: "Описание стиля дополнено новым примером.",
    error: "Действие не удалось.",
    loading: "Загрузка...",
    preview: "Анонимизированный preview",
  },
  en: {
    title: "AI profile",
    subtitle: "Customize the AI assistant for your clinical role and writing style.",
    enabled: "Use AI profile by default",
    role: "Professional role",
    specialty: "Specialty / field",
    workplace: "Work environment",
    experienceLevel: "Experience level",
    defaultClinicalContext: "Default clinical context",
    preferredStructure: "Preferred text structure",
    detailLevel: "Detail level",
    writingStyle: "Writing style",
    permanentInstructions: "Permanent instructions for AI",
    avoidInstructions: "What AI should avoid",
    styleSummary: "Style summary",
    exampleTitle: "Add a new writing sample",
    exampleHelp: "Paste one good sample at a time. First choose or write the text type so AI can distinguish remote contacts, referrals and discharge summaries. The original text is not saved.",
    examplePlaceholder: "Paste one visit note, remote contact, referral or discharge summary...",
    sourceLabel: "Text type / sample name",
    sourceLabelPlaceholder: "For example: Loppuarvio, Lähete, Etäkontakti, Vastaanottokäynti, Väliarvio",
    saveSample: "Store anonymized sample for later style refinement only if you want it kept",
    analyze: "Add sample to style",
    save: "Save AI profile",
    saved: "AI profile saved.",
    analyzed: "Style summary updated with the new sample.",
    error: "Action failed.",
    loading: "Loading...",
    preview: "Anonymized preview",
  },
};

const sampleTypeOptions = [
  "Vastaanottokäynti",
  "Etäkontakti",
  "Lähete",
  "Alkuarvio",
  "Väliarvio",
  "Loppuarvio",
  "SAS-lausunto",
  "Todistus / lausunto",
  "Muu",
];

function emptyProfile(): AiProfile {
  return { useProfileByDefault: true };
}

function value(profile: AiProfile, key: keyof AiProfile) {
  const current = profile[key];
  return typeof current === "string" ? current : "";
}

export default function AiProfileSettingsCard() {
  const { language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const t = dict[lang];

  const [profile, setProfile] = useState<AiProfile>(emptyProfile());
  const [exampleText, setExampleText] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [saveAnonymizedSample, setSaveAnonymizedSample] = useState(false);
  const [privacy, setPrivacy] = useState<PrivacyInfo>(null);
  const [anonymizedPreview, setAnonymizedPreview] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState("");

  const textFields = useMemo(() => [
    ["role", t.role, "Terveyskeskuslääkäri"] as const,
    ["specialty", t.specialty, "Yleislääketiede / päivystys / geriatria"] as const,
    ["workplace", t.workplace, "Terveysasema, akuuttiosasto, vastaanotto"] as const,
    ["experienceLevel", t.experienceLevel, "Erikoistuva / kokenut / konsultoiva"] as const,
    ["defaultClinicalContext", t.defaultClinicalContext, "Suomen perusterveydenhuolto"] as const,
    ["preferredStructure", t.preferredStructure, "Tulosyy, Esitiedot, Nykytila, Suunnitelma"] as const,
    ["detailLevel", t.detailLevel, "Tiivis mutta kliinisesti yksityiskohtainen"] as const,
    ["writingStyle", t.writingStyle, "Kronologinen, selkeä, ammattimainen"] as const,
  ], [t]);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/profile/ai");
        if (response.ok) {
          const data = await response.json();
          setProfile(data.profile || emptyProfile());
        }
      } catch (error) {
        console.error("AI profile loading failed", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const update = (key: keyof AiProfile, nextValue: string | boolean) => {
    setProfile((current) => ({ ...current, [key]: nextValue }));
  };

  const saveProfile = async () => {
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/profile/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error("save failed");
      const data = await response.json();
      setProfile(data.profile || profile);
      setMessage(t.saved);
    } catch (error) {
      setMessage(t.error);
    } finally {
      setIsSaving(false);
    }
  };

  const analyzeStyle = async () => {
    if (!exampleText.trim()) return;
    setIsAnalyzing(true);
    setMessage("");
    setPrivacy(null);
    setAnonymizedPreview("");
    try {
      const response = await fetch("/api/profile/ai/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: exampleText, sourceLabel, saveAnonymizedSample }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "analysis failed");
      setPrivacy(data.privacy || null);
      setAnonymizedPreview(data.anonymizedText || "");
      setProfile((current) => ({ ...current, styleSummary: data.styleSummary || current.styleSummary }));
      setExampleText("");
      setSourceLabel("");
      setMessage(t.analyzed);
    } catch (error) {
      setMessage(t.error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.title}</h2>
            <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
          </div>
        </div>
        {isLoading && <Loader2 size={20} className="animate-spin text-slate-400" />}
      </div>

      <label className="flex items-center gap-3 text-sm font-bold text-slate-700 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
        <input
          type="checkbox"
          checked={profile.useProfileByDefault !== false}
          onChange={(event) => update("useProfileByDefault", event.target.checked)}
          className="w-4 h-4"
        />
        {t.enabled}
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {textFields.map(([key, label, placeholder]) => (
          <label key={key} className="space-y-1.5">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
            <input
              value={value(profile, key)}
              onChange={(event) => update(key, event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
            />
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1.5">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">{t.permanentInstructions}</span>
          <textarea
            value={value(profile, "permanentInstructions")}
            onChange={(event) => update("permanentInstructions", event.target.value)}
            className="w-full h-28 rounded-2xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm outline-none resize-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">{t.avoidInstructions}</span>
          <textarea
            value={value(profile, "avoidInstructions")}
            onChange={(event) => update("avoidInstructions", event.target.value)}
            className="w-full h-28 rounded-2xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm outline-none resize-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
          />
        </label>
      </div>

      <label className="space-y-1.5 block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">{t.styleSummary}</span>
        <textarea
          value={value(profile, "styleSummary")}
          onChange={(event) => update("styleSummary", event.target.value)}
          className="w-full h-28 rounded-2xl border border-slate-200 bg-blue-50/30 px-4 py-3 text-sm outline-none resize-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
        />
      </label>

      <div className="border border-blue-100 bg-blue-50/40 rounded-[1.5rem] p-5 space-y-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-black text-slate-800">{t.exampleTitle}</h3>
            <p className="text-xs text-slate-500 mt-1">{t.exampleHelp}</p>
          </div>
        </div>

        <label className="space-y-1 block">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">{t.sourceLabel}</span>
          <input
            value={sourceLabel}
            onChange={(event) => setSourceLabel(event.target.value)}
            placeholder={t.sourceLabelPlaceholder}
            list="ai-profile-sample-types"
            className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300"
          />
          <datalist id="ai-profile-sample-types">
            {sampleTypeOptions.map((option) => <option key={option} value={option} />)}
          </datalist>
        </label>

        <textarea
          value={exampleText}
          onChange={(event) => setExampleText(event.target.value)}
          placeholder={t.examplePlaceholder}
          className="w-full h-36 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none resize-none focus:border-blue-300"
        />
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <input
            type="checkbox"
            checked={saveAnonymizedSample}
            onChange={(event) => setSaveAnonymizedSample(event.target.checked)}
          />
          {t.saveSample}
        </label>
        <button
          onClick={analyzeStyle}
          disabled={isAnalyzing || !exampleText.trim()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wide hover:bg-blue-700 disabled:bg-slate-300 transition-all"
        >
          {isAnalyzing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {t.analyze}
        </button>

        {privacy && <PrivacyNotice privacy={privacy} />}
        {anonymizedPreview && (
          <div className="rounded-2xl border border-blue-100 bg-white p-4">
            <div className="text-[10px] font-black uppercase text-slate-400 mb-2">{t.preview}</div>
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 font-sans">{anonymizedPreview}</pre>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={saveProfile}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-wide hover:bg-slate-800 disabled:bg-slate-300 transition-all"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {t.save}
        </button>
        {message && <div className="text-xs font-bold text-slate-500">{message}</div>}
      </div>
    </section>
  );
}
