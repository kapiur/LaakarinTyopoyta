import axios from "axios";
import { runRoutedAiCompletion } from "../ai/runRoutedAiCompletion";
import type { UserClinicalEvidenceConfig } from "../clinical/evidence/userClinicalSettings";
import type {
  LiteratureArticle,
  LiteratureGuidelineComparisonResult,
  LiteratureGuidelineComparisonSource,
  LiteratureGuidelineComparisonStatus,
} from "./types";

type CompareLanguage = "fi" | "ru" | "en";

type ComparisonSourceCandidate = {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceTitle: string;
  excerpt?: string;
  matchReason: string;
  publishedAt?: string;
  retrievedText: boolean;
};

type LocalizedComparisonStrings = {
  notFoundVerdict: string;
  notFoundSummary: string;
  manualVerdict: string;
  manualSummary: string;
  manualCheckLabel: string;
  sourceUnavailableLabel: string;
};

const DEFAULT_REQUEST_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8",
  "User-Agent": "Mozilla/5.0 (compatible; LaakarinTyopoyta/1.0; +https://github.com/kapiur/LaakarinTyopoyta)",
};

const QUERY_STOP_WORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "into",
  "that",
  "this",
  "study",
  "article",
  "review",
  "meta",
  "analysis",
  "clinical",
  "pregnancy",
  "patient",
  "patients",
  "treatment",
  "disease",
  "guideline",
  "suositus",
  "recommendation",
  "о",
  "и",
  "или",
  "для",
  "при",
  "это",
  "этой",
  "статья",
  "обзор",
  "пациент",
  "пациенты",
]);

function normalizeLanguage(value: string): CompareLanguage {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("fi")) return "fi";
  if (normalized.startsWith("ru")) return "ru";
  return "en";
}

function getLocalizedStrings(language: CompareLanguage): LocalizedComparisonStrings {
  if (language === "fi") {
    return {
      notFoundVerdict: "Sopivaa virallista suositusta ei löytynyt automaattisesti.",
      notFoundSummary: "Automaattinen vertailu ei löytänyt tähän artikkeliin sopivaa kansallista lähdettä. Tarkista haku käsin virallisesta lähteestä.",
      manualVerdict: "Virallinen lähde löytyi, mutta suositustekstiä ei saatu haettua luotettavasti automaattiseen vertailuun.",
      manualSummary: "Järjestelmä löysi aiheeseen sopivan virallisen lähteen, mutta itse suositusteksti jäi lataamatta. Avaa lähde ja tarkista keskeiset johtopäätökset käsin.",
      manualCheckLabel: "Tarkista käsin",
      sourceUnavailableLabel: "Suositusteksti ei ollut automaattisesti luettavissa.",
    };
  }

  if (language === "ru") {
    return {
      notFoundVerdict: "Подходящая официальная рекомендация автоматически не найдена.",
      notFoundSummary: "Автоматическая сверка не нашла релевантный национальный источник для этой статьи. Лучше выполнить ручную проверку в официальном источнике.",
      manualVerdict: "Официальный источник найден, но текст рекомендации не удалось надёжно получить для автоматической сверки.",
      manualSummary: "Система нашла подходящий официальный источник по теме, но сам текст рекомендации не был извлечён. Откройте источник и проверьте ключевые выводы вручную.",
      manualCheckLabel: "Проверить вручную",
      sourceUnavailableLabel: "Текст рекомендации автоматически не извлечён.",
    };
  }

  return {
    notFoundVerdict: "No matching official guideline was found automatically.",
    notFoundSummary: "The automatic check did not find a relevant national source for this article. Review the official source manually.",
    manualVerdict: "An official source was found, but the recommendation text could not be retrieved reliably for automated comparison.",
    manualSummary: "A relevant official source was identified, but the recommendation text itself could not be extracted. Open the source and verify the key conclusions manually.",
    manualCheckLabel: "Manual check",
    sourceUnavailableLabel: "Guideline text was not retrieved automatically.",
  };
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/");
}

function stripHtmlTags(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractReadableHtmlText(html: string) {
  const bodyMatch = html.match(/<article[\s\S]*?<\/article>/i)
    ?? html.match(/<main[\s\S]*?<\/main>/i)
    ?? html.match(/<body[\s\S]*?<\/body>/i);

  const relevantHtml = bodyMatch?.[0] ?? html;
  const cleanedHtml = relevantHtml
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ");

  const text = stripHtmlTags(cleanedHtml);
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length >= 60);

  return Array.from(new Set(paragraphs)).join("\n\n").trim();
}

function truncateAtBoundary(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const sliced = value.slice(0, maxLength);
  const lastBreak = Math.max(sliced.lastIndexOf("\n\n"), sliced.lastIndexOf(". "));
  if (lastBreak > Math.floor(maxLength * 0.6)) {
    return sliced.slice(0, lastBreak).trim();
  }
  return sliced.trim();
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/[^a-z0-9а-яёäöå\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQueryTerms(value: string) {
  return Array.from(
    new Set(
      normalizeForMatch(value)
        .split(" ")
        .map((item) => item.trim())
        .filter((item) => item.length >= 3 && !QUERY_STOP_WORDS.has(item)),
    ),
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countTermMatches(text: string, terms: string[]) {
  const normalizedText = normalizeForMatch(text);
  if (!normalizedText || terms.length === 0) return 0;

  return terms.reduce((count, term) => {
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    return pattern.test(normalizedText) ? count + 1 : count;
  }, 0);
}

function deriveSearchQuery(query: string | undefined, article: LiteratureArticle) {
  const base = (query ?? "").trim();
  if (base.length >= 6) return base;
  return article.title.trim() || article.abstract.trim().slice(0, 120);
}

function parseHtmlAnchors(html: string, baseUrl: string) {
  const matches = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));

  return matches
    .map((match) => {
      const rawHref = match[1]?.trim();
      const rawText = stripHtmlTags(match[2] ?? "");
      if (!rawHref || !rawText) return null;

      try {
        const href = new URL(rawHref, baseUrl).toString();
        return {
          href,
          text: rawText,
        };
      } catch {
        return null;
      }
    })
    .filter((item): item is { href: string; text: string } => Boolean(item));
}

async function fetchHtml(url: string) {
  const response = await axios.get(url, {
    timeout: 20000,
    maxRedirects: 5,
    headers: DEFAULT_REQUEST_HEADERS,
  });

  return typeof response.data === "string" ? response.data : "";
}

async function searchKaypaHoito(query: string) {
  const terms = extractQueryTerms(query);
  const searchUrl = `https://www.kaypahoito.fi/?s=${encodeURIComponent(query)}`;
  const html = await fetchHtml(searchUrl);
  const anchors = parseHtmlAnchors(html, "https://www.kaypahoito.fi/");
  const seen = new Set<string>();

  const candidates = anchors
    .filter((anchor) => anchor.href.startsWith("https://www.kaypahoito.fi/"))
    .filter((anchor) => !anchor.href.includes("/wp-content/"))
    .filter((anchor) => !anchor.href.includes("/tag/"))
    .filter((anchor) => !anchor.href.includes("/category/"))
    .filter((anchor) => !anchor.href.endsWith("/fi") && !anchor.href.endsWith("/sv") && !anchor.href.endsWith("/en"))
    .filter((anchor) => anchor.text.length >= 8 && anchor.text.length <= 220)
    .map((anchor) => {
      let score = countTermMatches(anchor.text, terms);
      if (/\/hoi|\/khp/i.test(anchor.href)) score += 3;
      if (/suositus/i.test(anchor.text)) score += 2;
      return {
        ...anchor,
        score,
      };
    })
    .filter((anchor) => anchor.score > 0)
    .sort((left, right) => right.score - left.score)
    .filter((anchor) => {
      if (seen.has(anchor.href)) return false;
      seen.add(anchor.href);
      return true;
    })
    .slice(0, 3);

  const result: ComparisonSourceCandidate[] = [];

  for (const candidate of candidates) {
    let excerpt = "";
    try {
      const pageHtml = await fetchHtml(candidate.href);
      excerpt = truncateAtBoundary(extractReadableHtmlText(pageHtml), 6000);
    } catch (error) {
      console.error("Käypä hoito page fetch failed:", { url: candidate.href, error });
    }

    result.push({
      sourceId: "fi-kaypa-hoito",
      sourceName: "Käypä hoito",
      sourceUrl: candidate.href,
      sourceTitle: candidate.text,
      excerpt: excerpt || undefined,
      matchReason: "Search result from Käypä hoito",
      retrievedText: Boolean(excerpt),
    });
  }

  return result;
}

function collectJsonText(node: unknown, output: string[] = [], depth = 0) {
  if (depth > 8 || node == null || output.length >= 120) return output;

  if (typeof node === "string") {
    const text = node.replace(/\s+/g, " ").trim();
    if (text.length >= 40) output.push(text);
    return output;
  }

  if (typeof node === "number" || typeof node === "boolean") {
    return output;
  }

  if (Array.isArray(node)) {
    for (const item of node) collectJsonText(item, output, depth + 1);
    return output;
  }

  if (typeof node !== "object") return output;

  const excludedKeys = new Set([
    "Id",
    "CodeVersion",
    "PrevCrId",
    "PublishDateStr",
    "Created",
    "Updated",
    "Version",
    "Status",
  ]);

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (excludedKeys.has(key)) continue;
    if (/html/i.test(key) && typeof value === "string") {
      const htmlText = truncateAtBoundary(extractReadableHtmlText(value), 5000);
      if (htmlText) output.push(htmlText);
      continue;
    }
    collectJsonText(value, output, depth + 1);
  }

  return output;
}

async function fetchMinzdravGuidelineDetail(codeVersion: string) {
  const detailUrls = [
    `https://apicr.minzdrav.gov.ru/api.ashx?op=GetClinrec2&id=${encodeURIComponent(codeVersion)}`,
    `https://apiapprovecr.minzdrav.gov.ru/api.ashx?op=GetClinrec2&id=${encodeURIComponent(codeVersion)}`,
  ];

  for (const url of detailUrls) {
    try {
      const response = await axios.get(url, {
        timeout: 20000,
        headers: {
          ...DEFAULT_REQUEST_HEADERS,
          Accept: "application/json,text/plain,*/*",
        },
      });

      const rawData = response.data;
      if (typeof rawData === "string") {
        const stripped = truncateAtBoundary(stripHtmlTags(rawData), 6000);
        if (stripped.length >= 400) return stripped;
      }

      const collected = collectJsonText(rawData);
      const joined = truncateAtBoundary(Array.from(new Set(collected)).join("\n\n"), 6000);
      if (joined.length >= 400) return joined;
    } catch (error) {
      console.error("Minzdrav detail fetch failed:", { url, error });
    }
  }

  const previewUrl = `https://cr.minzdrav.gov.ru/preview-cr/${encodeURIComponent(codeVersion)}`;
  try {
    const previewHtml = await fetchHtml(previewUrl);
    const previewText = truncateAtBoundary(extractReadableHtmlText(previewHtml), 6000);
    if (previewText.length >= 400) return previewText;
  } catch (error) {
    console.error("Minzdrav preview fetch failed:", { previewUrl, error });
  }

  return "";
}

async function searchMinzdrav(query: string) {
  const body = {
    filters: [
      {
        fieldName: "status",
        filterType: 1,
        filterValueType: 2,
        value1: 0,
        value2: "",
        values: [],
      },
      {
        fieldName: "name",
        filterType: 2,
        filterValueType: 1,
        value1: query,
        value2: "",
        values: [],
      },
    ],
    sortOption: {
      fieldName: "publishdate",
      sortType: 2,
    },
    pageSize: 3,
    currentPage: 1,
    useANDoperator: true,
    columns: [],
  };

  const response = await axios.post(
    "https://apicr.minzdrav.gov.ru/api.ashx?op=GetJsonClinrecsFilterV2",
    body,
    {
      timeout: 20000,
      headers: {
        ...DEFAULT_REQUEST_HEADERS,
        "Content-Type": "application/json",
      },
    },
  );

  const items = Array.isArray(response.data?.Data) ? response.data.Data : [];
  const result: ComparisonSourceCandidate[] = [];

  for (const item of items.slice(0, 3)) {
    const codeVersion = String(item?.CodeVersion ?? "").trim();
    const title = String(item?.Name ?? "").trim();
    if (!codeVersion || !title) continue;

    const previewUrl = `https://cr.minzdrav.gov.ru/preview-cr/${encodeURIComponent(codeVersion)}`;
    const excerpt = await fetchMinzdravGuidelineDetail(codeVersion);

    result.push({
      sourceId: "ru-minzdrav-clinical-recommendations",
      sourceName: "Минздрав РФ — рубрикатор клинических рекомендаций",
      sourceUrl: previewUrl,
      sourceTitle: title,
      excerpt: excerpt || undefined,
      matchReason: "Search result from the Russian clinical recommendation registry",
      publishedAt: typeof item?.PublishDateStr === "string" ? item.PublishDateStr : undefined,
      retrievedText: Boolean(excerpt),
    });
  }

  return result;
}

function mapSourcesToResult(sources: ComparisonSourceCandidate[]): LiteratureGuidelineComparisonSource[] {
  return sources.map((source) => ({
    sourceId: source.sourceId,
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    sourceTitle: source.sourceTitle,
    excerpt: source.excerpt,
    matchReason: source.matchReason,
    publishedAt: source.publishedAt,
    retrievedText: source.retrievedText,
  }));
}

function normalizeComparisonStatus(value: unknown): LiteratureGuidelineComparisonStatus {
  if (
    value === "aligned" ||
    value === "partially_aligned" ||
    value === "unclear" ||
    value === "not_found"
  ) {
    return value;
  }

  return "unclear";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function safeJsonParse<T>(content: string): T | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const candidates = [
    trimmed,
    trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim(),
  ];

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }

  return null;
}

function buildNoSourceFallback(
  language: CompareLanguage,
  clinicalCountry: "FI" | "RU",
  searchQuery: string,
  sources: ComparisonSourceCandidate[],
): LiteratureGuidelineComparisonResult {
  const strings = getLocalizedStrings(language);

  if (sources.length === 0) {
    return {
      status: "not_found",
      verdict: strings.notFoundVerdict,
      comparisonSummary: strings.notFoundSummary,
      agreementPoints: [],
      cautionPoints: [],
      suggestedChecks: [],
      searchQuery,
      clinicalCountry,
      displayLanguage: language,
      sources: [],
    };
  }

  return {
    status: "unclear",
    verdict: strings.manualVerdict,
    comparisonSummary: strings.manualSummary,
    agreementPoints: [],
    cautionPoints: [strings.sourceUnavailableLabel],
    suggestedChecks: sources.map((source) => `${strings.manualCheckLabel}: ${source.sourceTitle}`).slice(0, 3),
    searchQuery,
    clinicalCountry,
    displayLanguage: language,
    sources: mapSourcesToResult(sources),
  };
}

async function retrieveGuidelineCandidates(
  clinicalConfig: UserClinicalEvidenceConfig,
  searchQuery: string,
) {
  if (clinicalConfig.clinicalCountry === "FI") {
    return searchKaypaHoito(searchQuery);
  }

  return searchMinzdrav(searchQuery);
}

export async function compareArticleWithGuidelines(input: {
  userId: number;
  article: LiteratureArticle;
  articleContextText: string;
  searchQuery?: string;
  displayLanguage: string;
  clinicalConfig: UserClinicalEvidenceConfig;
}): Promise<LiteratureGuidelineComparisonResult> {
  const searchQuery = deriveSearchQuery(input.searchQuery, input.article);
  const displayLanguage = normalizeLanguage(input.displayLanguage || input.clinicalConfig.clinicalOutputLanguage);

  let candidates: ComparisonSourceCandidate[] = [];
  try {
    candidates = await retrieveGuidelineCandidates(input.clinicalConfig, searchQuery);
  } catch (error) {
    console.error("Guideline retrieval failed:", error);
  }

  const retrievedCandidates = candidates.filter((candidate) => candidate.retrievedText);
  if (retrievedCandidates.length === 0) {
    return buildNoSourceFallback(
      displayLanguage,
      input.clinicalConfig.clinicalCountry,
      searchQuery,
      candidates,
    );
  }

  const sourceContext = retrievedCandidates
    .slice(0, 2)
    .map((source, index) => [
      `Official source ${index + 1}: ${source.sourceName}`,
      `Title: ${source.sourceTitle}`,
      source.publishedAt ? `Published/updated: ${source.publishedAt}` : "",
      `URL: ${source.sourceUrl}`,
      `Excerpt:\n${source.excerpt}`,
    ].filter(Boolean).join("\n\n"))
    .join("\n\n---\n\n");

  const systemInstruction = [
    "You compare one literature article against retrieved excerpts from official national clinical guidance.",
    "Use only the provided article text and official source excerpts.",
    "Do not invent missing recommendations, trial results, or treatment details.",
    "Return JSON only with keys status, verdict, comparisonSummary, agreementPoints, cautionPoints, suggestedChecks.",
    "status must be one of aligned, partially_aligned, unclear, not_found.",
    "agreementPoints, cautionPoints, and suggestedChecks must be arrays of short strings.",
    `Write all user-facing text in ${displayLanguage}.`,
  ].join(" ");

  const userInstruction = [
    `Clinical country: ${input.clinicalConfig.clinicalCountry}`,
    `Working language for the answer: ${displayLanguage}`,
    "Compare the article with the official-source excerpts below.",
    "Keep the answer compact and physician-facing.",
    "If the official excerpt supports only part of the article's claim, use partially_aligned.",
    "If the excerpts are too generic to confirm the article's specific claim, use unclear.",
    "Do not write meta-commentary about being an AI or about the task itself.",
    `Article context:\n${truncateAtBoundary(input.articleContextText, 12000)}`,
    `Official-source context:\n${sourceContext}`,
  ].join("\n\n");

  try {
    const result = await runRoutedAiCompletion({
      userId: input.userId,
      taskType: "clinical_guideline_comparison",
      temperature: 0,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userInstruction },
      ],
    });

    const parsed = safeJsonParse<{
      status?: LiteratureGuidelineComparisonStatus;
      verdict?: string;
      comparisonSummary?: string;
      agreementPoints?: string[];
      cautionPoints?: string[];
      suggestedChecks?: string[];
    }>(typeof result.content === "string" ? result.content : "");

    if (!parsed) {
      throw new Error("Guideline comparison response was not valid JSON");
    }

    return {
      status: normalizeComparisonStatus(parsed.status),
      verdict: typeof parsed.verdict === "string" && parsed.verdict.trim() ? parsed.verdict.trim() : getLocalizedStrings(displayLanguage).manualVerdict,
      comparisonSummary:
        typeof parsed.comparisonSummary === "string" && parsed.comparisonSummary.trim()
          ? parsed.comparisonSummary.trim()
          : getLocalizedStrings(displayLanguage).manualSummary,
      agreementPoints: normalizeStringArray(parsed.agreementPoints),
      cautionPoints: normalizeStringArray(parsed.cautionPoints),
      suggestedChecks: normalizeStringArray(parsed.suggestedChecks),
      searchQuery,
      clinicalCountry: input.clinicalConfig.clinicalCountry,
      displayLanguage,
      sources: mapSourcesToResult(retrievedCandidates.slice(0, 2)),
    };
  } catch (error) {
    console.error("Guideline comparison AI step failed:", error);
    return buildNoSourceFallback(
      displayLanguage,
      input.clinicalConfig.clinicalCountry,
      searchQuery,
      candidates,
    );
  }
}
