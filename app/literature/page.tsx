"use client";

import { useMemo, useState } from "react";
import {
  BookText,
  ExternalLink,
  FileSearch,
  Globe,
  Languages,
  Loader2,
  MessageSquareShare,
  Microscope,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useI18n } from "../../lib/useI18n";
import type { AgentConversationTurn } from "../../lib/ai/agent/types";
import type {
  LiteratureArticle,
  LiteratureGuidelineComparisonResult,
  LiteratureRegionFilter,
  LiteratureSearchSort,
  LiteratureSummaryResult,
  LiteratureTranslationResult,
  LiteratureTrustFilter,
} from "../../lib/literature/types";

type SearchResponse = {
  query: string;
  executedQuery?: string;
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
      baseUrl?: string;
      language: string[];
    }>;
  };
};

type ViewMode = "original" | "translation" | "summary";
type InterpretationMode = "translation" | "summary";

type AgentResponse = {
  reply?: string;
  draft?: string;
  error?: string;
};

type ArticleContextResponse = {
  contextText?: string;
  fullTextAvailable?: boolean;
  fullTextSource?: "pmc" | "publisher_html" | "abstract_only";
  fullTextUrl?: string | null;
  pmcid?: string | null;
};

type GuidelineCompareResponse = {
  comparison?: LiteratureGuidelineComparisonResult;
  error?: string;
};

type SearchOverrides = Partial<{
  yearsBack: string;
  studyFilter: string;
  regionFilter: LiteratureRegionFilter;
  sortBy: LiteratureSearchSort;
  trustFilter: LiteratureTrustFilter;
  fullTextOnly: boolean;
  maxResults: number;
}>;

const DEFAULT_VISIBLE_LIMIT = 12;

const workspaceLabels = {
  fi: { discuss: "Keskustele artikkelista AI:n kanssa" },
  ru: { discuss: "Обсудить статью с AI" },
  en: { discuss: "Discuss article with AI" },
  de: { discuss: "Artikel mit AI besprechen" },
} as const;

function buildInterpretationKey(pmid: string, mode: InterpretationMode) {
  return `${pmid}:${mode}`;
}

function trustClasses(level: LiteratureArticle["trustLevel"]) {
  if (level === "high") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (level === "moderate") return "bg-blue-50 text-blue-700 border-blue-200";
  if (level === "low") return "bg-amber-50 text-amber-700 border-amber-200";
  if (level === "preliminary") return "bg-purple-50 text-purple-700 border-purple-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function guidelineStatusClasses(status: LiteratureGuidelineComparisonResult["status"]) {
  if (status === "aligned") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "partially_aligned") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "unclear") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function buildArticleCurrentText(article: LiteratureArticle) {
  return [
    `Title: ${article.title}`,
    article.journal ? `Journal: ${article.journal}` : "",
    article.year ? `Year: ${article.year}` : "",
    `Source language: ${article.sourceLanguageLabel} (${article.sourceLanguage})`,
    `Study type: ${article.studyType}`,
    article.publicationTypes.length > 0 ? `Publication types: ${article.publicationTypes.join(", ")}` : "",
    `Trust level: ${article.trustLevel}`,
    article.abstract ? `Abstract:\n${article.abstract}` : "Abstract: not available",
  ].filter(Boolean).join("\n\n");
}

function splitIntoSentences(value: string) {
  return value
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildLocalTranslationFallback(article: LiteratureArticle): LiteratureTranslationResult {
  return {
    translatedTitle: article.title,
    translatedAbstract: article.abstract,
    translatedText: article.abstract || article.title,
  };
}

function parseAgentTranslation(article: LiteratureArticle, replyText: string): LiteratureTranslationResult {
  const normalized = replyText.trim();
  if (!normalized) {
    return buildLocalTranslationFallback(article);
  }

  const cleaned = normalized
    .replace(/^#+\s*/gm, "")
    .replace(/^Название\s*:\s*/i, "")
    .replace(/^Заголовок\s*:\s*/i, "")
    .replace(/^Title\s*:\s*/i, "");

  const parts = cleaned
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      translatedTitle: parts[0],
      translatedAbstract: parts.slice(1).join("\n\n"),
      translatedText: cleaned,
    };
  }

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    return {
      translatedTitle: lines[0],
      translatedAbstract: lines.slice(1).join("\n"),
      translatedText: cleaned,
    };
  }

  return {
    translatedTitle: article.title,
    translatedAbstract: cleaned,
    translatedText: cleaned,
  };
}

function buildLocalSummaryFallback(article: LiteratureArticle): LiteratureSummaryResult {
  const summaryBullets = splitIntoSentences(article.abstract).slice(0, 3);
  return {
    localizedTitle: article.title,
    studyTypeLabel: article.studyType,
    summaryBullets,
    limitations: article.abstract ? [] : [article.trustReason],
    clinicalRelevance: article.abstract ? article.trustReason : "",
    trustNote: article.trustReason,
    summaryText: article.abstract || article.trustReason,
  };
}

function buildSummaryDraftText(summary?: LiteratureSummaryResult | null) {
  if (!summary) return "";
  if (summary.summaryText) return summary.summaryText;

  const sections = [
    summary.localizedTitle,
    summary.summaryBullets.length > 0 ? summary.summaryBullets.map((item) => `- ${item}`).join("\n") : "",
    summary.limitations.length > 0 ? `Limitations:\n${summary.limitations.map((item) => `- ${item}`).join("\n")}` : "",
    summary.clinicalRelevance ? `Clinical relevance:\n${summary.clinicalRelevance}` : "",
    summary.trustNote ? `Trust note:\n${summary.trustNote}` : "",
  ].filter(Boolean);

  return sections.join("\n\n");
}

function stripServiceScaffolding(value: string) {
  const normalized = value.replace(/\r/g, "").trim();
  if (!normalized) return "";

  const lines = normalized.split("\n");
  const heading1Index = lines.findIndex((line) => /^\s*1[.)]\s+/.test(line));
  const heading2Index = lines.findIndex((line, index) => index > heading1Index && /^\s*2[.)]\s+/.test(line));
  const heading3Index = lines.findIndex((line, index) => index > heading2Index && /^\s*3[.)]\s+/.test(line));
  const heading4Index = lines.findIndex((line, index) => index > heading3Index && /^\s*4[.)]\s+/.test(line));

  if (heading1Index !== -1 && heading2Index !== -1 && heading3Index !== -1) {
    const keptLines = heading4Index === -1 ? lines.slice(heading3Index + 1) : lines.slice(heading3Index + 1, heading4Index);
    const cleaned = keptLines.join("\n").trim();
    if (cleaned) return cleaned;
  }

  return normalized;
}

export default function LiteraturePage({
  embedded = false,
  onDiscussResult,
}: {
  embedded?: boolean;
  onDiscussResult?: (content: string, contextLabel?: string) => void;
}) {
  const { t, language } = useI18n();
  const workspaceCopy = workspaceLabels[language as keyof typeof workspaceLabels] ?? workspaceLabels.en;
  const [query, setQuery] = useState("");
  const [yearsBack, setYearsBack] = useState("5");
  const [studyFilter, setStudyFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState<LiteratureRegionFilter>("all");
  const [sortBy, setSortBy] = useState<LiteratureSearchSort>("relevance");
  const [trustFilter, setTrustFilter] = useState<LiteratureTrustFilter>("all");
  const [fullTextOnly, setFullTextOnly] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(DEFAULT_VISIBLE_LIMIT);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<LiteratureArticle | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("original");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingMode, setLoadingMode] = useState<ViewMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [translationCache, setTranslationCache] = useState<Record<string, LiteratureTranslationResult>>({});
  const [summaryCache, setSummaryCache] = useState<Record<string, LiteratureSummaryResult>>({});
  const [guidelineCache, setGuidelineCache] = useState<Record<string, LiteratureGuidelineComparisonResult>>({});
  const [articleContextCache, setArticleContextCache] = useState<Record<string, ArticleContextResponse>>({});
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, string>>({});
  const [followUpHistory, setFollowUpHistory] = useState<Record<string, AgentConversationTurn[]>>({});
  const [refiningMode, setRefiningMode] = useState<InterpretationMode | null>(null);
  const [loadingGuidelineCompare, setLoadingGuidelineCompare] = useState(false);

  const targetLanguage = language || results?.context?.targetLanguage || "fi";

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

  const guidelineStatusLabels = useMemo(
    () => ({
      aligned: t("literature.guidelineStatusAligned"),
      partially_aligned: t("literature.guidelineStatusPartial"),
      unclear: t("literature.guidelineStatusUnclear"),
      not_found: t("literature.guidelineStatusNotFound"),
    }),
    [t],
  );

  async function performSearch(overrides: SearchOverrides = {}) {
    const nextYearsBack = overrides.yearsBack ?? yearsBack;
    const nextStudyFilter = overrides.studyFilter ?? studyFilter;
    const nextRegionFilter = overrides.regionFilter ?? regionFilter;
    const nextSortBy = overrides.sortBy ?? sortBy;
    const nextTrustFilter = overrides.trustFilter ?? trustFilter;
    const nextFullTextOnly = overrides.fullTextOnly ?? fullTextOnly;
    const nextVisibleLimit = overrides.maxResults ?? visibleLimit;
    const trimmedQuery = query.trim();

    if (!trimmedQuery) return;

    setLoadingSearch(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: trimmedQuery,
        yearsBack: nextYearsBack,
        studyFilter: nextStudyFilter,
        regionFilter: nextRegionFilter,
        sortBy: nextSortBy,
        trustFilter: nextTrustFilter,
        fullTextOnly: String(nextFullTextOnly),
        maxResults: String(nextVisibleLimit),
      });
      const response = await fetch(`/api/literature/search?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || t("literature.loadingFailed"));
      }

      setResults(data);
      setYearsBack(nextYearsBack);
      setStudyFilter(nextStudyFilter);
      setRegionFilter(nextRegionFilter);
      setSortBy(nextSortBy);
      setTrustFilter(nextTrustFilter);
      setFullTextOnly(nextFullTextOnly);
      setVisibleLimit(nextVisibleLimit);
      setSelectedArticle((current) => {
        if (!current) return data.articles?.[0] ?? null;
        return data.articles?.find((article: LiteratureArticle) => article.pmid === current.pmid) ?? data.articles?.[0] ?? null;
      });
      setViewMode("original");
    } catch (searchError) {
      console.error("Literature search failed", searchError);
      setError(t("literature.loadingFailed"));
    } finally {
      setLoadingSearch(false);
    }
  }

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    setVisibleLimit(DEFAULT_VISIBLE_LIMIT);
    await performSearch({ maxResults: DEFAULT_VISIBLE_LIMIT });
  }

  async function loadMoreResults() {
    await performSearch({ maxResults: visibleLimit + DEFAULT_VISIBLE_LIMIT });
  }

  async function applyQuickNarrow(overrides: SearchOverrides) {
    await performSearch({
      ...overrides,
      maxResults: DEFAULT_VISIBLE_LIMIT,
    });
  }

  async function ensureArticleContext(article: LiteratureArticle, mode: InterpretationMode) {
    const cachedContext = articleContextCache[article.pmid];
    if (cachedContext) {
      return cachedContext;
    }

    const contextResponse = await fetch("/api/literature/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        article,
        mode,
      }),
    });
    const contextData = await contextResponse.json() as ArticleContextResponse & { error?: string };

    if (!contextResponse.ok) {
      throw new Error(contextData?.error || t("literature.interpretationFailed"));
    }

    setArticleContextCache((current) => ({
      ...current,
      [article.pmid]: contextData,
    }));

    return contextData;
  }

  async function loadInterpretation(mode: InterpretationMode) {
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
      const articleContext = await ensureArticleContext(selectedArticle, mode);

      const agentInstruction =
        mode === "translation"
          ? [
              `Translate the provided medical article title and abstract into ${targetLanguage}.`,
              "Write in natural physician-facing medical language, not as a literal word-for-word calque.",
              "Prefer established clinical terminology and readable medical syntax.",
              "You may slightly restructure long sentences or titles to sound natural in medical writing, but do not change the meaning.",
              "Keep standard drug names, biomarker names, and abbreviations such as SGLT2, GLP-1, CKD, HbA1c, MRI in their usual medical form.",
              "Do not simplify the science and do not add commentary.",
              articleContext?.fullTextAvailable
                ? "Use the available PMC full text as the primary source, and use the abstract only as supporting context."
                : "Only abstract-level context is available, so do not imply that the full article was reviewed.",
              "Return exactly this format with no labels:",
              "1) first line: translated article title only",
              "2) blank line",
              "3) translated abstract only",
            ].join(" ")
          : [
              `Provide a concise physician-facing summary of the provided medical article in ${targetLanguage}.`,
              articleContext?.fullTextAvailable
                ? "Use the provided article metadata, abstract, and retrieved article text."
                : "Use only the provided article metadata and abstract.",
              "Structure the answer as short paragraphs or bullets covering main point, limitations, and clinical relevance.",
              "Do not add facts that are not present in the article text.",
              "Write the medical summary directly. Do not begin with meta-commentary about what was or was not provided.",
              "Do not write phrases such as 'the full text was not fully available', 'the available fragment shows', or 'below is a cautious summary' unless the user explicitly asks about source completeness.",
              "If some numeric details or subgroup results are genuinely missing, mention that only briefly at the end and only when it materially limits interpretation.",
              articleContext?.fullTextAvailable
                ? "Base the summary on the retrieved article text and abstract rather than discussing source availability."
                : "If only the abstract is available, state uncertainty modestly and do not pretend to have reviewed the full paper.",
            ].join(" ");

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextType: "general",
          uiLanguage: language,
          userMessage: agentInstruction,
          currentText: articleContext?.contextText || buildArticleCurrentText(selectedArticle),
          currentTextKind: "publicSourceText",
        }),
      });
      const data = await response.json() as AgentResponse;

      if (!response.ok) {
        throw new Error(data?.error || t("literature.interpretationFailed"));
      }

      const replyText = stripServiceScaffolding((data.draft || data.reply || "").trim());

      if (mode === "translation") {
        setTranslationCache((current) => ({
          ...current,
          [selectedArticle.pmid]: replyText
            ? parseAgentTranslation(selectedArticle, replyText)
            : buildLocalTranslationFallback(selectedArticle),
        }));
        setViewMode("translation");
      } else {
        setSummaryCache((current) => ({
          ...current,
          [selectedArticle.pmid]: replyText
            ? {
                localizedTitle: selectedArticle.title,
                studyTypeLabel: selectedArticle.studyType,
                summaryBullets: [],
                limitations: [],
                clinicalRelevance: "",
                trustNote: selectedArticle.trustReason,
                summaryText: replyText,
              }
            : buildLocalSummaryFallback(selectedArticle),
        }));
        setViewMode("summary");
      }
    } catch (interpretError) {
      console.error("Literature interpretation failed", interpretError);
      if (mode === "translation") {
        setTranslationCache((current) => ({
          ...current,
          [selectedArticle.pmid]: buildLocalTranslationFallback(selectedArticle),
        }));
        setViewMode("translation");
      } else {
        setSummaryCache((current) => ({
          ...current,
          [selectedArticle.pmid]: buildLocalSummaryFallback(selectedArticle),
        }));
        setViewMode("summary");
      }
    } finally {
      setLoadingMode(null);
    }
  }

  async function loadGuidelineComparison(forceRefresh = false) {
    if (!selectedArticle) return;
    if (!forceRefresh && guidelineCache[selectedArticle.pmid]) return;

    setLoadingGuidelineCompare(true);
    setError(null);

    try {
      const response = await fetch("/api/literature/guideline-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article: selectedArticle,
          query: results?.query || selectedArticle.title,
          displayLanguage: language || targetLanguage,
        }),
      });

      const data = await response.json() as GuidelineCompareResponse;
      if (!response.ok || !data.comparison) {
        throw new Error(data?.error || t("literature.guidelineCompareFailed"));
      }

      setGuidelineCache((current) => ({
        ...current,
        [selectedArticle.pmid]: data.comparison as LiteratureGuidelineComparisonResult,
      }));
    } catch (compareError) {
      console.error("Literature guideline comparison failed", compareError);
      setError(t("literature.guidelineCompareFailed"));
    } finally {
      setLoadingGuidelineCompare(false);
    }
  }

  const selectedTranslation = selectedArticle ? translationCache[selectedArticle.pmid] : null;
  const selectedSummary = selectedArticle ? summaryCache[selectedArticle.pmid] : null;
  const selectedGuidelineComparison = selectedArticle ? guidelineCache[selectedArticle.pmid] : null;
  const currentInterpretationKey =
    selectedArticle && viewMode !== "original" ? buildInterpretationKey(selectedArticle.pmid, viewMode) : null;
  const currentInterpretationText =
    viewMode === "translation"
      ? selectedTranslation?.translatedText || selectedTranslation?.translatedAbstract || ""
      : viewMode === "summary"
        ? buildSummaryDraftText(selectedSummary)
        : "";
  const currentFollowUpValue = currentInterpretationKey ? followUpDrafts[currentInterpretationKey] ?? "" : "";

  const currentDiscussionContent = useMemo(() => {
    if (!selectedArticle) return "";

    const articleText = buildArticleCurrentText(selectedArticle);
    const interpretationText =
      viewMode === "translation"
        ? selectedTranslation?.translatedText || selectedTranslation?.translatedAbstract || ""
        : viewMode === "summary"
          ? buildSummaryDraftText(selectedSummary)
          : "";
    const guidelineText = selectedGuidelineComparison
      ? [
          "Guideline comparison",
          `Verdict: ${selectedGuidelineComparison.verdict}`,
          selectedGuidelineComparison.comparisonSummary,
          selectedGuidelineComparison.agreementPoints.length > 0
            ? `Agreement:\n${selectedGuidelineComparison.agreementPoints.map((item) => `- ${item}`).join("\n")}`
            : "",
          selectedGuidelineComparison.cautionPoints.length > 0
            ? `Cautions:\n${selectedGuidelineComparison.cautionPoints.map((item) => `- ${item}`).join("\n")}`
            : "",
          selectedGuidelineComparison.sources.length > 0
            ? `Official sources:\n${selectedGuidelineComparison.sources.map((source) => `- ${source.sourceTitle}: ${source.sourceUrl}`).join("\n")}`
            : "",
        ].filter(Boolean).join("\n\n")
      : "";

    return [articleText, interpretationText, guidelineText].filter(Boolean).join("\n\n---\n\n");
  }, [selectedArticle, selectedGuidelineComparison, selectedSummary, selectedTranslation, viewMode]);

  async function submitFollowUp() {
    if (!selectedArticle || viewMode === "original" || !currentInterpretationKey) return;

    const followUpMessage = currentFollowUpValue.trim();
    if (!followUpMessage) return;

    setRefiningMode(viewMode);
    setError(null);

    try {
      const articleContext = await ensureArticleContext(selectedArticle, viewMode);
      const agentInstruction =
        viewMode === "translation"
          ? [
              `Revise the existing physician-facing medical translation of the same article in ${targetLanguage}.`,
              "Follow the user's latest request while keeping the meaning faithful to the source text.",
              "Use natural medical language, not literal word-for-word phrasing.",
              "Keep standard drug names, biomarker names, and medical abbreviations in their usual clinical form.",
              "Return only the revised translated text.",
              `User request: ${followUpMessage}`,
            ].join(" ")
          : [
              `Refine or extend the existing physician-facing output for the same medical article in ${targetLanguage}.`,
              articleContext?.fullTextAvailable
                ? "Use the available article metadata, abstract, and retrieved article text."
                : "Use only the available article metadata and abstract context.",
              "Follow the user's latest request and stay grounded strictly in the article text.",
              "Do not add unsupported facts or imply access to sections that were not available.",
              "Return the revised medical answer directly without meta-commentary about missing fragments unless that limitation is essential to the requested interpretation.",
              "If the user asks for a different structure such as bullets, a critical appraisal, or a compact table, provide it from the same article context.",
              "Return only the revised answer.",
              `User request: ${followUpMessage}`,
            ].join(" ");

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextType: "general",
          uiLanguage: language,
          userMessage: agentInstruction,
          currentText: articleContext?.contextText || buildArticleCurrentText(selectedArticle),
          currentTextKind: "publicSourceText",
          conversationContext: {
            latestDraft: currentInterpretationText,
            previousTurns: followUpHistory[currentInterpretationKey] ?? [],
          },
          conversationContextKind: "publicSourceText",
        }),
      });
      const data = await response.json() as AgentResponse;

      if (!response.ok) {
        throw new Error(data?.error || t("literature.interpretationFailed"));
      }

      const replyText = stripServiceScaffolding((data.draft || data.reply || "").trim());
      if (!replyText) {
        throw new Error(t("literature.interpretationFailed"));
      }

      if (viewMode === "translation") {
        setTranslationCache((current) => ({
          ...current,
          [selectedArticle.pmid]: parseAgentTranslation(selectedArticle, replyText),
        }));
      } else {
        setSummaryCache((current) => ({
          ...current,
          [selectedArticle.pmid]: {
            localizedTitle: selectedArticle.title,
            studyTypeLabel: selectedArticle.studyType,
            summaryBullets: [],
            limitations: [],
            clinicalRelevance: "",
            trustNote: selectedArticle.trustReason,
            summaryText: replyText,
          },
        }));
      }

      setFollowUpHistory((current) => ({
        ...current,
        [currentInterpretationKey]: [
          ...(current[currentInterpretationKey] ?? []).slice(-3),
          {
            userMessage: followUpMessage,
            assistantReply: replyText,
            assistantDraft: replyText,
            taskType: viewMode === "translation" ? "literature_translation_refinement" : "literature_summary_refinement",
          },
        ],
      }));
      setFollowUpDrafts((current) => ({
        ...current,
        [currentInterpretationKey]: "",
      }));
    } catch (followUpError) {
      console.error("Literature follow-up failed", followUpError);
      setError(t("literature.interpretationFailed"));
    } finally {
      setRefiningMode(null);
    }
  }

  return (
    <div className={embedded ? "space-y-4 p-4" : "space-y-6"}>
      {!embedded && <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8 lg:rounded-[2rem]">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
            <BookText size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t("literature.title")}</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">{t("literature.subtitle")}</p>
          </div>
        </div>
      </header>}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className={embedded ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : "grid grid-cols-1 xl:grid-cols-12 gap-6"}>
        <section className={embedded ? "contents" : "xl:col-span-3 space-y-6"}>
          <form onSubmit={runSearch} className={embedded ? "order-1 space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2" : "space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:rounded-[2rem]"}>
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

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("literature.regionLabel")}</label>
                <select
                  value={regionFilter}
                  onChange={(event) => setRegionFilter(event.target.value as LiteratureRegionFilter)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">{t("literature.regionAll")}</option>
                  <option value="us">{t("literature.regionUs")}</option>
                  <option value="europe">{t("literature.regionEurope")}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("literature.sortLabel")}</label>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as LiteratureSearchSort)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="relevance">{t("literature.sortRelevance")}</option>
                  <option value="newest">{t("literature.sortNewest")}</option>
                  <option value="highest_evidence">{t("literature.sortHighestEvidence")}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("literature.trustFilterLabel")}</label>
                <select
                  value={trustFilter}
                  onChange={(event) => setTrustFilter(event.target.value as LiteratureTrustFilter)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">{t("literature.trustFilterAll")}</option>
                  <option value="high">{t("literature.trustFilterHigh")}</option>
                  <option value="moderate">{t("literature.trustFilterModerate")}</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={fullTextOnly}
                onChange={(event) => setFullTextOnly(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-100"
              />
              <span className="font-medium">{t("literature.fullTextOnly")}</span>
            </label>

            <button
              type="submit"
              disabled={loadingSearch || !query.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingSearch && <Loader2 size={16} className="animate-spin" />}
              {loadingSearch ? t("literature.searching") : t("literature.searchButton")}
            </button>
          </form>

          <section className={embedded ? "order-4 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2" : "bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4"}>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                {t("literature.guidelineContext")}
              </h2>
              <p className="text-sm text-slate-500 mt-1">{t("literature.guidelineContextDescription")}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.currentClinicalCountry")}</div>
                <div className="mt-2 text-base font-bold text-slate-900">{results?.context?.clinicalCountry ?? "-"}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.targetLanguage")}</div>
                <div className="mt-2 text-base font-bold text-slate-900">{targetLanguage || "-"}</div>
              </div>
            </div>

            {selectedArticle ? (
              <>
                <button
                  type="button"
                  onClick={() => void loadGuidelineComparison(Boolean(selectedGuidelineComparison))}
                  disabled={loadingGuidelineCompare}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loadingGuidelineCompare ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                  {loadingGuidelineCompare
                    ? t("literature.guidelineCompareLoading")
                    : selectedGuidelineComparison
                      ? t("literature.guidelineCompareRefresh")
                      : t("literature.guidelineCompareButton")}
                </button>

                {selectedGuidelineComparison ? (
                  <div className="space-y-4">
                    <div className={`rounded-2xl border px-4 py-3 ${guidelineStatusClasses(selectedGuidelineComparison.status)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-bold">{selectedGuidelineComparison.verdict}</div>
                        <span className="shrink-0 rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[11px] font-semibold">
                          {guidelineStatusLabels[selectedGuidelineComparison.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {selectedGuidelineComparison.comparisonSummary}
                      </p>
                    </div>

                    {selectedGuidelineComparison.agreementPoints.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {t("literature.guidelineAgreementTitle")}
                        </div>
                        <ul className="space-y-2">
                          {selectedGuidelineComparison.agreementPoints.map((item) => (
                            <li key={item} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedGuidelineComparison.cautionPoints.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {t("literature.guidelineCautionTitle")}
                        </div>
                        <ul className="space-y-2">
                          {selectedGuidelineComparison.cautionPoints.map((item) => (
                            <li key={item} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedGuidelineComparison.suggestedChecks.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {t("literature.guidelineSuggestedChecksTitle")}
                        </div>
                        <ul className="space-y-2">
                          {selectedGuidelineComparison.suggestedChecks.map((item) => (
                            <li key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.officialSources")}</div>
                      {selectedGuidelineComparison.sources.length > 0 ? (
                        <div className="space-y-3">
                          {selectedGuidelineComparison.sources.map((source) => (
                            <div key={`${source.sourceId}:${source.sourceUrl}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-bold text-slate-900">{source.sourceTitle}</div>
                                  <div className="mt-1 text-xs text-slate-500">{source.sourceName}</div>
                                </div>
                                <a
                                  href={source.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  <ExternalLink size={12} />
                                  {t("literature.articleLink")}
                                </a>
                              </div>
                              {source.excerpt ? (
                                <p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-6 whitespace-pre-line">
                                  {source.excerpt}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : results?.context?.officialSources?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {results.context.officialSources.map((source) => (
                            source.baseUrl ? (
                              <a
                                key={source.id}
                                href={source.baseUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-300 hover:text-emerald-800"
                              >
                                <ExternalLink size={12} />
                                {source.name}
                              </a>
                            ) : (
                              <span
                                key={source.id}
                                className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                              >
                                {source.name}
                              </span>
                            )
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">{results ? t("literature.guidelineNoSources") : "-"}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {t("literature.guidelineManualCheckNotice")}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {t("literature.guidelineNoArticleSelected")}
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.officialSources")}</div>
                  {results?.context?.officialSources?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {results.context.officialSources.map((source) => (
                        source.baseUrl ? (
                          <a
                            key={source.id}
                            href={source.baseUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-300 hover:text-emerald-800"
                          >
                            <ExternalLink size={12} />
                            {source.name}
                          </a>
                        ) : (
                          <span
                            key={source.id}
                            className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                          >
                            {source.name}
                          </span>
                        )
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">{results ? t("literature.guidelineNoSources") : "-"}</span>
                  )}
                </div>
              </>
            )}
          </section>
        </section>

        <section className={embedded ? "order-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" : "xl:col-span-4 bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden"}>
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">{results ? `${results.total} ${t("literature.resultCount")}` : t("literature.emptyTitle")}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {results ? results.query : t("literature.emptyDescription")}
            </p>
            {results && (
              <p className="text-xs text-slate-400 mt-2">
                {t("literature.showingCount")} {results.articles.length}
              </p>
            )}
            {results?.executedQuery && results.executedQuery !== results.query && (
              <p className="text-xs text-slate-400 mt-2">
                {t("literature.searchExecutedAs")} {results.executedQuery}
              </p>
            )}
            {results && (
              <div className="mt-4 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.quickNarrowTitle")}</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void applyQuickNarrow({ trustFilter: "high" })}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {t("literature.narrowHighEvidence")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void applyQuickNarrow({ studyFilter: "review", yearsBack: "5", sortBy: "highest_evidence" })}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {t("literature.narrowLatestReviews")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void applyQuickNarrow({ fullTextOnly: true })}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {t("literature.narrowFullText")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void applyQuickNarrow({ sortBy: "newest" })}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {t("literature.narrowNewest")}
                  </button>
                </div>
              </div>
            )}
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
                  {article.fullTextAvailable && (
                    <span className="px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-[11px] font-semibold text-blue-700">
                      {t("literature.fullTextBadge")}
                    </span>
                  )}
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

            {results && results.total > results.articles.length && (
              <div className="p-4 border-t border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={() => void loadMoreResults()}
                  disabled={loadingSearch}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  {loadingSearch && <Loader2 size={15} className="animate-spin" />}
                  {t("literature.loadMore")}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className={embedded ? "order-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" : "xl:col-span-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden"}>
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
                {onDiscussResult && (
                  <button
                    type="button"
                    onClick={() => onDiscussResult(currentDiscussionContent, selectedArticle.title)}
                    disabled={!currentDiscussionContent}
                    className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                  >
                    <MessageSquareShare size={13} />
                    {workspaceCopy.discuss}
                  </button>
                )}
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
              <div className="space-y-5">
                <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                  {t("literature.machineTranslationNotice")}
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedTranslation?.translatedTitle || t("literature.translationEmpty")}
                </h3>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                  {selectedTranslation?.translatedText || selectedTranslation?.translatedAbstract || t("literature.translationEmpty")}
                </div>
                {!embedded && currentInterpretationKey && currentInterpretationText && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.followUpTitle")}</div>
                      <p className="mt-1 text-sm text-slate-500">{t("literature.followUpDescription")}</p>
                    </div>
                    <textarea
                      value={currentFollowUpValue}
                      onChange={(event) => setFollowUpDrafts((current) => ({
                        ...current,
                        [currentInterpretationKey]: event.target.value,
                      }))}
                      placeholder={t("literature.followUpPlaceholder")}
                      className="w-full h-28 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={submitFollowUp}
                        disabled={refiningMode === viewMode || !currentFollowUpValue.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
                      >
                        {refiningMode === viewMode ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        {refiningMode === viewMode ? t("literature.followUpLoading") : t("literature.followUpButton")}
                      </button>
                    </div>
                  </div>
                )}
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

                {selectedSummary?.summaryText ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                    {selectedSummary.summaryText}
                  </div>
                ) : (
                  <>
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
                  </>
                )}

                {(selectedSummary?.trustNote || selectedArticle.trustReason) && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.trustLevel")}</div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      {selectedSummary?.trustNote || selectedArticle.trustReason}
                    </p>
                  </div>
                )}

                {!embedded && currentInterpretationKey && currentInterpretationText && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("literature.followUpTitle")}</div>
                      <p className="mt-1 text-sm text-slate-500">{t("literature.followUpDescription")}</p>
                    </div>
                    <textarea
                      value={currentFollowUpValue}
                      onChange={(event) => setFollowUpDrafts((current) => ({
                        ...current,
                        [currentInterpretationKey]: event.target.value,
                      }))}
                      placeholder={t("literature.followUpPlaceholder")}
                      className="w-full h-28 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-100 resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={submitFollowUp}
                        disabled={refiningMode === viewMode || !currentFollowUpValue.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
                      >
                        {refiningMode === viewMode ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        {refiningMode === viewMode ? t("literature.followUpLoading") : t("literature.followUpButton")}
                      </button>
                    </div>
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
