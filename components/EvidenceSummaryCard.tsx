"use client";

import { CalendarClock, ShieldCheck, Tag } from "lucide-react";
import { useI18n } from "../lib/useI18n";

export type EvidenceSummaryData = {
  clinicalCountry: string;
  clinicalOutputLanguage: string;
  evidenceStrictness: "strict" | "balanced" | "local-aware";
  confidenceLevel: "high" | "moderate" | "contextual";
  officialSourceCount: number;
  latestSourceSyncAt?: string;
  sources: Array<{
    id: string;
    name: string;
    trustLevel: string;
    isOfficial: boolean;
    baseUrl?: string;
    language: string[];
    lastSyncedAt?: string;
  }>;
};

const copy = {
  fi: {
    title: "Johtopäätöksen perusta",
    source: "Lähteet",
    updated: "Ajantasaisuus",
    confidence: "Varmuustaso",
    confidenceHigh: "Korkea",
    confidenceModerate: "Kohtalainen",
    confidenceContextual: "Kontekstisidonnainen",
    modeStrict: "Vain viralliset lähteet",
    modeBalanced: "Tasapainoinen käyttö",
    modeLocal: "Myös paikallinen konteksti",
    noDate: "Ei synkronointitietoa",
    officialCount: "aktiivista virallista lähdettä",
  },
  ru: {
    title: "Основание вывода",
    source: "Источники",
    updated: "Актуально на",
    confidence: "Уровень уверенности",
    confidenceHigh: "Высокий",
    confidenceModerate: "Умеренный",
    confidenceContextual: "Контекстный",
    modeStrict: "Только официальные источники",
    modeBalanced: "Сбалансированный режим",
    modeLocal: "С учетом локального контекста",
    noDate: "Нет данных о синхронизации",
    officialCount: "активных официальных источников",
  },
  en: {
    title: "Basis of the conclusion",
    source: "Sources",
    updated: "Current as of",
    confidence: "Confidence",
    confidenceHigh: "High",
    confidenceModerate: "Moderate",
    confidenceContextual: "Contextual",
    modeStrict: "Official sources only",
    modeBalanced: "Balanced mode",
    modeLocal: "Local context included",
    noDate: "No sync date available",
    officialCount: "active official sources",
  },
  de: {
    title: "Grundlage der Schlussfolgerung",
    source: "Quellen",
    updated: "Stand",
    confidence: "Sicherheitsniveau",
    confidenceHigh: "Hoch",
    confidenceModerate: "Mittel",
    confidenceContextual: "Kontextbezogen",
    modeStrict: "Nur offizielle Quellen",
    modeBalanced: "Ausgewogener Modus",
    modeLocal: "Mit lokalem Kontext",
    noDate: "Keine Synchronisationsdaten",
    officialCount: "aktive offizielle Quellen",
  },
} as const;

function formatDate(value: string | undefined, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function EvidenceSummaryCard({ summary }: { summary: EvidenceSummaryData }) {
  const { language } = useI18n();
  const l = copy[language as keyof typeof copy] ?? copy.en;
  const latestDate = formatDate(summary.latestSourceSyncAt, language);
  const confidenceLabel =
    summary.confidenceLevel === "high"
      ? l.confidenceHigh
      : summary.confidenceLevel === "moderate"
        ? l.confidenceModerate
        : l.confidenceContextual;
  const modeLabel =
    summary.evidenceStrictness === "strict"
      ? l.modeStrict
      : summary.evidenceStrictness === "balanced"
        ? l.modeBalanced
        : l.modeLocal;

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">{l.title}</div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Tag size={12} />
            {l.source}
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900">{summary.officialSourceCount} {l.officialCount}</div>
          <div className="mt-1 text-xs text-slate-500">{summary.clinicalCountry} · {modeLabel}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <CalendarClock size={12} />
            {l.updated}
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900">{latestDate || l.noDate}</div>
          <div className="mt-1 text-xs text-slate-500">{summary.clinicalOutputLanguage}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <ShieldCheck size={12} />
            {l.confidence}
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900">{confidenceLabel}</div>
          <div className="mt-1 text-xs text-slate-500">{modeLabel}</div>
        </div>
      </div>

      {summary.sources.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.sources.slice(0, 4).map((source) => (
            <span key={source.id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {source.name}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
