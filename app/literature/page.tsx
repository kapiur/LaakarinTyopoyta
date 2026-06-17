"use client";

import { useMemo, useState } from "react";
import {
  BookText,
  ExternalLink,
  FileSearch,
  Globe,
  Languages,
  Loader2,
  Microscope,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useI18n } from "../../lib/useI18n";
import type {
  LiteratureArticle,
  LiteratureSummaryResult,
  LiteratureTranslationResult,
} from "../../lib/literature/types";

type SearchResponse = {
  query: string;
  total: number;
  articles: LiteratureArticle[];
  context?: {
    practiceCountry: string;
    clinicalCountry: string;
    targetLanguage: string;
    officialSources: Array<{
      id: string;
      name: string;
      trustLevel: string;
      language: string[];
    }>;
  };
};

type ViewMode = "original" | "translation" | "summary";

function trustClasses(level: LiteratureArticle["trustLevel"]) {
  if (level === "high") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (level === "moderate") return "bg-blue-50 text-blue-700 border-blue-200";
  if (level === "low") return "bg-amber-50 text-amber-700 border-amber-200";
  if (level === "preliminary") return "bg-purple-50 text-purple-700 border-purple-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function LiteraturePage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [yearsBack, setYearsBack] = useState("5");
  const [studyFilter, setStudyFilter] = useState("all");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<LiteratureArticle | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("original");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingMode, setLoadingMode] = useState<ViewMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [translationCache, setTranslationCache] = useState<Record<string, LiteratureTranslationResult>>({});
  const [summaryCache, setSummaryCache] = useState<Record<string, LiteratureSummaryResult>>({});

  const targetLanguage = results?.context?.targetLanguage ?? "fi";

  const trustLabels = useMemo(
    () => ({
      high: t("literature.trustHigh"),
      moderate: t("literature.trustModerate"),
      low: t("literature.trustLow"),
      preliminary: t("literature.trustPreliminary"),
      unknown: t("literature.trustUnknown"),
    }),
    [t],
  );

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;

    setLoadingSearch(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        yearsBack,
        studyFilter,
        maxResults: "12",
      });
      const response = await fetch(`/api/literature/search?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || t("literature.loadingFailed"));
      }

      setResults(data);
      setSelectedArticle(data.articles?.[0] ?? null);
      setViewMode("original");
    } catch (searchError) {
      console.error("Literature search failed", searchError);
      setError(t("literature.loadingFailed"));
    } finally {
      setLoadingSearch(false);
    }
  }

  async function loadInterpretation(mode: "translation" | "summary") {
    if (!selectedArticle) return;
    if (mode === "translation" && translationCache[selectedArticle.pmid]) {
      setViewMode("translation");
      return;
    }
    if (mode === "summary" && summaryCache[selectedArticle.pmid]) {
      setViewMode("summary");
      return;
    }

    setLoadingMode(mode);
    setError(null);
    try {
      const response = await fetch("/api/literature/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article: selectedArticle,
          mode,
          targetLanguage,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || t("literature.interpretationFailed"));
      }

      if (mode === "translation") {
        setTranslationCache((current) => ({
          ...current,
          [selectedArticle.pmid]: data.translation,
        }));
        setViewMode("translation");
      } else {
        setSummaryCache((current) => ({
          ...current,
          [selectedArticle.pmid]: data.summary,
        }));
        setViewMode("summary");
      }
    } catch (interpretError) {
      console.error("Literature interpretation failed", interpretError);
      setError(t("literature.interpretationFailed"));
    } finally {
      setLoadingMode(null);
    }
  }

  const selectedTranslation = selectedArticle ? translationCache[selectedArticle.pmid] : null;
  const selectedSummary = selectedArticle ? summaryCache[selectedArticle.pmid] : null;

  return (
    <div className="space-y-6">
      <header className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
            <BookText size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t("literature.title")}</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">{t("literature.subtitle")}</p>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-3 space-y-6">
          <form onSubmit={runSearch} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSearch size={20} className="text-blue-600" />
                {t("literature.searchTitle")}
              </h2>
              <p className="text-sm text-slate-500 mt-1">{t("literature.searchDescription")}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("literature.queryLabel")}</label>
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("literature.queryPlaceholder")}
                className="w-full h-32 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("literature.yearsLabel")}</label>
                <select
                  value={yearsBack}
                  onChange={(event) => setYearsBack(event.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="5">{t("literature.yearsOption5")}</option>
                  <option value="10">{t("literature.yearsOption10")}</option>
                  <option value="15">{t("literature.yearsOption15")}</option>
                  <option value="all">{t("literature.yearsOptionAll")}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("literature.studyTypeLabel")}</label>
                <select
                  value={studyFilter}
                  onChange={(event) => setStudyFilter(event.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">{t("literature.studyTypeAll")}</option>
                  <option value="guideline">{t("literature.studyTypeGuideline")}</option>
                  <option value="review">{t("literature.studyTypeReview")}</option>
                  <option value="trial">{t("literature.studyTypeTrial")}</option>
                  <option value="observational">{t("literature.studyTypeObservational")}</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingSearch || !query.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingSearch && <Loader2 size={16} className="animate-spin" />}
              {loadingSearch ? t("literature.searching") : t("literature.searchButton")}
            </button>
          </form>

          <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                {t("literature.guidelineContext")}
              </h2>
              <p className="text-sm text-slate-500 mt-1">{t("literature.guidelineContextDescription")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.currentClinicalCountry")}</div>
                <div className="mt-2 text-base font-bold text-slate-900">{results?.context?.clinicalCountry ?? "-"}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.targetLanguage")}</div>
                <div className="mt-2 text-base font-bold text-slate-900">{results?.context?.targetLanguage ?? "-"}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.officialSources")}</div>
              <div className="flex flex-wrap gap-2">
                {results?.context?.officialSources?.length ? results.context.officialSources.map((source) => (
                  <span key={source.id} className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                    {source.name}
                  </span>
                )) : <span className="text-sm text-slate-400">-</span>}
              </div>
            </div>
          </section>
        </section>

        <section className="xl:col-span-4 bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">{results ? `${results.total} ${t("literature.resultCount")}` : t("literature.emptyTitle")}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {results ? results.query : t("literature.emptyDescription")}
            </p>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {!results && (
              <div className="p-6 text-sm text-slate-500">{t("literature.emptyDescription")}</div>
            )}

            {results && results.articles.length === 0 && (
              <div className="p-6 text-sm text-slate-500">{t("literature.noResults")}</div>
            )}

            {results?.articles.map((article) => (
              <button
                key={article.pmid}
                type="button"
                onClick={() => {
                  setSelectedArticle(article);
                  setViewMode("original");
                }}
                className={`w-full text-left px-6 py-5 border-b border-slate-100 transition-colors ${
                  selectedArticle?.pmid === article.pmid ? "bg-blue-50/60" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${trustClasses(article.trustLevel)}`}>
                    {trustLabels[article.trustLevel]}
                  </span>
                  <span className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-600">
                    {article.studyType}
                  </span>
                  <span className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 inline-flex items-center gap-1">
                    <Globe size={12} />
                    {article.sourceLanguageLabel}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">{article.title}</h3>
                <p className="mt-2 text-xs text-slate-500">
                  {[article.journal, article.year].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-3 text-sm text-slate-600 line-clamp-4 whitespace-pre-line">
                  {article.abstract || t("literature.articleMissingAbstract")}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("literature.selectedArticle")}</div>
              <h2 className="mt-2 text-xl font-bold text-slate-900 leading-tight">
                {selectedArticle?.title || t("literature.emptyTitle")}
              </h2>
              {selectedArticle && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{selectedArticle.journal || "-"}</span>
                  {selectedArticle.year ? <span>· {selectedArticle.year}</span> : null}
                  {selectedArticle.authors.length > 0 ? <span>· {selectedArticle.authors.slice(0, 3).join(", ")}</span> : null}
                </div>
              )}
            </div>

            {selectedArticle && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode("original")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border ${viewMode === "original" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
                >
                  {t("literature.original")}
                </button>
                <button
                  type="button"
                  onClick={() => loadInterpretation("translation")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border inline-flex items-center gap-2 ${viewMode === "translation" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200"}`}
                >
                  {loadingMode === "translation" ? <Loader2 size={13} className="animate-spin" /> : <Languages size={13} />}
                  {loadingMode === "translation" ? t("literature.translating") : t("literature.translateButton")}
                </button>
                <button
                  type="button"
                  onClick={() => loadInterpretation("summary")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border inline-flex items-center gap-2 ${viewMode === "summary" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200"}`}
                >
                  {loadingMode === "summary" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {loadingMode === "summary" ? t("literature.summarizing") : t("literature.summarizeButton")}
                </button>
                {selectedArticle.url && (
                  <a
                    href={selectedArticle.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-600 inline-flex items-center gap-2"
                  >
                    <ExternalLink size={13} />
                    {t("literature.articleLink")}
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {!selectedArticle && <p className="text-sm text-slate-500">{t("literature.emptyDescription")}</p>}

            {selectedArticle && viewMode === "original" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.sourceLanguage")}</div>
                    <div className="mt-2 text-sm font-bold text-slate-900">{selectedArticle.sourceLanguageLabel}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.trustLevel")}</div>
                    <div className="mt-2 text-sm font-bold text-slate-900">{trustLabels[selectedArticle.trustLevel]}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.studyType")}</div>
                  <div className="mt-2 text-sm font-bold text-slate-900">{selectedArticle.studyType}</div>
                  <p className="mt-2 text-sm text-slate-500">{selectedArticle.trustReason}</p>
                </div>

                {selectedArticle.publicationTypes.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.publicationTypes")}</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedArticle.publicationTypes.map((type) => (
                        <span key={type} className="px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.abstract")}</div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                    {selectedArticle.abstract || t("literature.articleMissingAbstract")}
                  </div>
                </div>
              </div>
            )}

            {selectedArticle && viewMode === "translation" && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                  {t("literature.machineTranslationNotice")}
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedTranslation?.translatedTitle || t("literature.translationEmpty")}
                </h3>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                  {selectedTranslation?.translatedAbstract || t("literature.translationEmpty")}
                </div>
              </div>
            )}

            {selectedArticle && viewMode === "summary" && (
              <div className="space-y-5">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                  {t("literature.summaryNotice")}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedSummary?.localizedTitle || t("literature.summaryEmpty")}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedSummary?.studyTypeLabel || selectedArticle.studyType}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 inline-flex items-center gap-2">
                    <Microscope size={12} />
                    {t("literature.summary")}
                  </div>
                  <ul className="space-y-2">
                    {(selectedSummary?.summaryBullets ?? []).map((item) => (
                      <li key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedSummary?.limitations?.length ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.limitationsTitle")}</div>
                    <ul className="space-y-2">
                      {selectedSummary.limitations.map((item) => (
                        <li key={item} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {selectedSummary?.clinicalRelevance ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.clinicalRelevanceTitle")}</div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{selectedSummary.clinicalRelevance}</p>
                  </div>
                ) : null}

                {(selectedSummary?.trustNote || selectedArticle.trustReason) && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.trustLevel")}</div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      {selectedSummary?.trustNote || selectedArticle.trustReason}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
