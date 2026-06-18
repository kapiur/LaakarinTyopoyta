import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import type { LiteratureArticle, LiteratureRegionFilter, LiteratureSearchResult, LiteratureStudyFilter, LiteratureTrustLevel } from "./types";

const PUBMED_ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const PUBMED_EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
const PMC_EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
});

const LANGUAGE_LABELS: Record<string, string> = {
  eng: "English",
  fin: "Finnish",
  rus: "Russian",
  ger: "German",
  deu: "German",
  swe: "Swedish",
  fre: "French",
  fra: "French",
  spa: "Spanish",
  ita: "Italian",
  por: "Portuguese",
  dut: "Dutch",
  est: "Estonian",
};

const LOW_VALUE_PUBLICATION_PATTERNS = [
  "editorial",
  "comment",
  "letter",
  "news",
  "interview",
  "biography",
  "portrait",
  "retracted publication",
];

const QUERY_STOP_WORDS = new Set([
  "and",
  "or",
  "the",
  "for",
  "with",
  "from",
  "into",
  "that",
  "this",
  "those",
  "these",
  "study",
  "studies",
  "article",
  "articles",
  "title",
  "abstract",
  "mesh",
  "terms",
  "term",
  "publication",
  "type",
  "types",
  "patient",
  "patients",
]);

const EUROPE_AFFILIATION_TERMS = [
  "Europe",
  "European Union",
  "EU",
  "United Kingdom",
  "England",
  "Scotland",
  "Wales",
  "Ireland",
  "Northern Ireland",
  "Finland",
  "Sweden",
  "Norway",
  "Denmark",
  "Iceland",
  "Estonia",
  "Latvia",
  "Lithuania",
  "Poland",
  "Germany",
  "France",
  "Spain",
  "Portugal",
  "Italy",
  "Netherlands",
  "Belgium",
  "Luxembourg",
  "Austria",
  "Switzerland",
  "Czech Republic",
  "Slovakia",
  "Hungary",
  "Slovenia",
  "Croatia",
  "Romania",
  "Bulgaria",
  "Greece",
  "Cyprus",
  "Malta",
  "Ukraine",
  "Moldova",
  "Serbia",
  "Bosnia",
  "Montenegro",
  "Albania",
  "North Macedonia",
];

function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function textOf(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  if (typeof record["#text"] === "string") return record["#text"].trim();
  if (typeof record["$text"] === "string") return record["$text"].trim();

  return Object.values(record)
    .map((item) => textOf(item))
    .find(Boolean) ?? "";
}

function collectAbstractParts(abstractNode: unknown): string[] {
  const abstractText = (abstractNode as Record<string, unknown> | undefined)?.AbstractText;
  return ensureArray(abstractText)
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object") return "";

      const record = item as Record<string, unknown>;
      const label = typeof record.Label === "string" ? `${record.Label.trim()}: ` : "";
      return `${label}${textOf(record)}`.trim();
    })
    .filter(Boolean);
}

function extractYear(articleNode: Record<string, unknown>): string {
  const articleDate = ensureArray(articleNode.ArticleDate).map((item) => {
    if (!item || typeof item !== "object") return "";
    return textOf((item as Record<string, unknown>).Year);
  }).find(Boolean);
  if (articleDate) return articleDate;

  const pubDate = ((articleNode.Journal as Record<string, unknown> | undefined)?.JournalIssue as Record<string, unknown> | undefined)?.PubDate as Record<string, unknown> | undefined;
  const year = textOf(pubDate?.Year);
  if (year) return year;

  const medlineDate = textOf(pubDate?.MedlineDate);
  const match = medlineDate.match(/\b(19|20)\d{2}\b/);
  return match?.[0] ?? "";
}

function extractAuthors(authorListNode: unknown): string[] {
  return ensureArray((authorListNode as Record<string, unknown> | undefined)?.Author)
    .map((author) => {
      if (!author || typeof author !== "object") return "";
      const record = author as Record<string, unknown>;
      const collectiveName = textOf(record.CollectiveName);
      if (collectiveName) return collectiveName;
      const lastName = textOf(record.LastName);
      const initials = textOf(record.Initials);
      return [lastName, initials].filter(Boolean).join(" ").trim();
    })
    .filter(Boolean);
}

function extractDoi(pubmedDataNode: unknown): string {
  const articleIds = ensureArray((pubmedDataNode as Record<string, unknown> | undefined)?.ArticleIdList?.["ArticleId"]);
  for (const articleId of articleIds) {
    if (!articleId || typeof articleId !== "object") continue;
    const record = articleId as Record<string, unknown>;
    if (record.IdType === "doi") {
      const doi = textOf(record);
      if (doi) return doi;
    }
  }
  return "";
}

function extractPmcId(pubmedDataNode: unknown): string {
  const articleIds = ensureArray((pubmedDataNode as Record<string, unknown> | undefined)?.ArticleIdList?.["ArticleId"]);
  for (const articleId of articleIds) {
    if (!articleId || typeof articleId !== "object") continue;
    const record = articleId as Record<string, unknown>;
    if (record.IdType === "pmc") {
      const pmcid = textOf(record);
      if (pmcid) return pmcid.startsWith("PMC") ? pmcid : `PMC${pmcid}`;
    }
  }
  return "";
}

function normalizeLanguageCode(rawLanguage: string) {
  const normalized = rawLanguage.toLowerCase().trim();
  if (normalized.length === 2) return normalized;
  if (normalized === "eng") return "en";
  if (normalized === "fin") return "fi";
  if (normalized === "rus") return "ru";
  if (normalized === "ger" || normalized === "deu") return "de";
  if (normalized === "swe") return "sv";
  return normalized;
}

function getLanguageLabel(rawLanguage: string) {
  const normalized = rawLanguage.toLowerCase().trim();
  return LANGUAGE_LABELS[normalized] ?? normalized.toUpperCase();
}

function normalizePublicationTypes(publicationTypes: string[]) {
  return publicationTypes.map((item) => item.trim()).filter(Boolean);
}

function looksLikeUnavailableTitle(title: string) {
  const normalized = title.trim().toLowerCase();
  return normalized === "[not available]." || normalized === "[not available]" || normalized === "not available";
}

function hasUsefulAbstract(abstract: string) {
  const normalized = abstract.trim();
  if (!normalized) return false;
  if (normalized.length < 80) return false;
  if (/abstract not available/i.test(normalized)) return false;
  return true;
}

function isLowValuePublicationType(publicationTypes: string[]) {
  const lower = publicationTypes.map((item) => item.toLowerCase());
  return lower.some((item) => LOW_VALUE_PUBLICATION_PATTERNS.some((pattern) => item.includes(pattern)));
}

function normalizeForTermMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQueryTerms(query: string) {
  const normalized = normalizeForTermMatch(query);
  return Array.from(new Set(
    normalized
      .split(" ")
      .map((item) => item.trim())
      .filter((item) => item.length >= 3 && !QUERY_STOP_WORDS.has(item)),
  ));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countTermMatches(text: string, terms: string[]) {
  const normalizedText = normalizeForTermMatch(text);
  if (!normalizedText || terms.length === 0) return 0;
  return terms.reduce((count, term) => {
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    return pattern.test(normalizedText) ? count + 1 : count;
  }, 0);
}

function isLikelyVeterinaryArticle(article: Pick<LiteratureArticle, "title" | "abstract" | "journal" | "publicationTypes">) {
  const combined = [article.title, article.abstract, article.journal, article.publicationTypes.join(" ")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const veterinarySignals = [
    "veterinary",
    "canine",
    "feline",
    "equine",
    "bovine",
    "porcine",
    "murine",
    "swine",
    "goat",
    "sheep",
    "dog ",
    "dogs ",
    "cat ",
    "cats ",
    "horse",
    "horses",
    "animal study",
    "animal model",
  ];
  const humanSignals = [
    "patient",
    "patients",
    "human",
    "humans",
    "adult",
    "adults",
    "older adult",
    "elderly",
    "hospital",
    "outpatient",
    "clinical",
  ];

  return veterinarySignals.some((signal) => combined.includes(signal)) && !humanSignals.some((signal) => combined.includes(signal));
}

function trustScore(level: LiteratureTrustLevel) {
  if (level === "high") return 5;
  if (level === "moderate") return 3;
  if (level === "preliminary") return 1;
  if (level === "low") return -1;
  return 0;
}

function getStudyType(publicationTypes: string[]): string {
  const lower = publicationTypes.map((item) => item.toLowerCase());

  if (lower.some((item) => item.includes("practice guideline") || item === "guideline")) return "Guideline";
  if (lower.some((item) => item.includes("meta-analysis"))) return "Meta-analysis";
  if (lower.some((item) => item.includes("systematic review"))) return "Systematic review";
  if (lower.some((item) => item.includes("randomized controlled trial") || item.includes("clinical trial"))) return "Clinical trial";
  if (lower.some((item) => item.includes("cohort") || item.includes("case-control") || item.includes("observational"))) return "Observational study";
  if (lower.some((item) => item.includes("case reports") || item.includes("case report"))) return "Case report";
  if (lower.some((item) => item.includes("review"))) return "Review";
  return "Unspecified";
}

function getTrust(publicationTypes: string[]): { trustLevel: LiteratureTrustLevel; trustReason: string } {
  const lower = publicationTypes.map((item) => item.toLowerCase());

  if (lower.some((item) => item.includes("preprint"))) {
    return { trustLevel: "preliminary", trustReason: "Preprint or otherwise preliminary publication type." };
  }
  if (lower.some((item) => item.includes("practice guideline") || item === "guideline" || item.includes("meta-analysis") || item.includes("systematic review"))) {
    return { trustLevel: "high", trustReason: "Higher-tier evidence type such as a guideline or evidence synthesis." };
  }
  if (lower.some((item) => item.includes("randomized controlled trial") || item.includes("clinical trial") || item.includes("multicenter study"))) {
    return { trustLevel: "moderate", trustReason: "Interventional or structured comparative study design." };
  }
  if (lower.some((item) => item.includes("cohort") || item.includes("case-control") || item.includes("observational") || item.includes("review"))) {
    return { trustLevel: "moderate", trustReason: "Useful evidence, but generally below guideline-level synthesis." };
  }
  if (lower.some((item) => item.includes("case reports") || item.includes("case report") || item.includes("letter") || item.includes("editorial"))) {
    return { trustLevel: "low", trustReason: "Lower-evidence publication type." };
  }

  return { trustLevel: "unknown", trustReason: "Publication type did not clearly map to a confidence tier." };
}

function buildStudyFilterClause(studyFilter: LiteratureStudyFilter) {
  if (studyFilter === "guideline") return '(guideline[Publication Type] OR practice guideline[Publication Type])';
  if (studyFilter === "review") return '("systematic review"[Title/Abstract] OR meta-analysis[Publication Type] OR review[Publication Type])';
  if (studyFilter === "trial") return '("randomized controlled trial"[Publication Type] OR "clinical trial"[Publication Type])';
  if (studyFilter === "observational") return '("observational study"[Publication Type] OR "cohort studies"[MeSH Terms] OR "case-control studies"[MeSH Terms])';
  return "";
}

function buildRegionFilterClause(regionFilter: LiteratureRegionFilter) {
  if (regionFilter === "us") {
    return '("United States"[Affiliation] OR "United States of America"[Affiliation] OR USA[Affiliation] OR U.S.[Affiliation])';
  }

  if (regionFilter === "europe") {
    return `(${EUROPE_AFFILIATION_TERMS.map((term) => `"${term}"[Affiliation]`).join(" OR ")})`;
  }

  return "";
}

type SearchPubMedInput = {
  query: string;
  yearsBack: number | null;
  maxResults: number;
  studyFilter: LiteratureStudyFilter;
  regionFilter: LiteratureRegionFilter;
};

type FullTextResult = {
  pmcid?: string;
  fullText: string;
  fullTextUrl?: string;
  source: "pmc" | "publisher_html" | "abstract_only";
};

export async function searchPubMedArticles(input: SearchPubMedInput): Promise<LiteratureSearchResult> {
  const query = input.query.trim();
  if (!query) {
    return { query: "", total: 0, articles: [] };
  }

  const searchClauses = [
    query,
    buildStudyFilterClause(input.studyFilter),
    buildRegionFilterClause(input.regionFilter),
  ].filter(Boolean);
  const term = searchClauses.length > 1 ? searchClauses.map((clause) => `(${clause})`).join(" AND ") : searchClauses[0];
  const currentYear = new Date().getUTCFullYear();
  const fetchLimit = Math.max(input.maxResults, Math.min(input.maxResults * 4, 48));
  const params: Record<string, string | number> = {
    db: "pubmed",
    retmode: "json",
    retmax: fetchLimit,
    sort: "relevance",
    term,
  };

  if (input.yearsBack && Number.isFinite(input.yearsBack) && input.yearsBack > 0) {
    params.datetype = "pdat";
    params.mindate = `${currentYear - input.yearsBack + 1}/01/01`;
    params.maxdate = `${currentYear}/12/31`;
  }

  const searchResponse = await axios.get(PUBMED_ESEARCH_URL, { params, timeout: 15000 });
  const searchResult = searchResponse.data?.esearchresult;
  const ids: string[] = ensureArray(searchResult?.idlist).map((id) => String(id)).filter(Boolean);
  const total = Number(searchResult?.count ?? ids.length ?? 0);

  if (ids.length === 0) {
    return { query, total: 0, articles: [] };
  }

  const fetchResponse = await axios.get(PUBMED_EFETCH_URL, {
    params: {
      db: "pubmed",
      id: ids.join(","),
      retmode: "xml",
    },
    timeout: 20000,
  });

  const parsed = xmlParser.parse(fetchResponse.data);
  const rawArticles = ensureArray(parsed?.PubmedArticleSet?.PubmedArticle);
  const queryTerms = extractQueryTerms(query);

  const mappedArticles: LiteratureArticle[] = rawArticles.map((raw) => {
    const medline = (raw as Record<string, unknown>).MedlineCitation as Record<string, unknown>;
    const article = medline?.Article as Record<string, unknown>;
    const pubmedData = (raw as Record<string, unknown>).PubmedData;

    const pmid = textOf(medline?.PMID);
    const title = textOf(article?.ArticleTitle);
    const abstract = collectAbstractParts(article?.Abstract).join("\n\n");
    const publicationTypes = normalizePublicationTypes(
      ensureArray((article?.PublicationTypeList as Record<string, unknown> | undefined)?.PublicationType).map((item) => textOf(item)),
    );
    const sourceLanguageRaw = textOf(ensureArray(article?.Language)[0] ?? "eng") || "eng";
    const sourceLanguage = normalizeLanguageCode(sourceLanguageRaw);
    const doi = extractDoi(pubmedData);
    const pmcid = extractPmcId(pubmedData);
    const { trustLevel, trustReason } = getTrust(publicationTypes);

    return {
      pmid,
      pmcid: pmcid || undefined,
      title,
      abstract,
      journal: textOf(article?.Journal && (article.Journal as Record<string, unknown>).Title),
      year: extractYear(article),
      doi: doi || undefined,
      url: doi ? `https://doi.org/${doi}` : `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      fullTextUrl: pmcid ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/` : undefined,
      fullTextAvailable: Boolean(pmcid),
      authors: extractAuthors(article?.AuthorList),
      sourceLanguage,
      sourceLanguageLabel: getLanguageLabel(sourceLanguageRaw),
      publicationTypes,
      studyType: getStudyType(publicationTypes),
      trustLevel,
      trustReason,
    };
  }).filter((article) => article.pmid && article.title);

  const rankedArticles = mappedArticles
    .map((article) => {
      const relevanceHits = countTermMatches(`${article.title} ${article.abstract}`, queryTerms);
      const usefulAbstract = hasUsefulAbstract(article.abstract);
      const lowValuePublicationType = isLowValuePublicationType(article.publicationTypes);
      const likelyVeterinary = isLikelyVeterinaryArticle(article);

      let score = trustScore(article.trustLevel);
      score += usefulAbstract ? 4 : -2;
      score += article.doi ? 1 : 0;
      score += relevanceHits * 3;
      score += lowValuePublicationType ? -4 : 0;
      score += likelyVeterinary ? -6 : 0;
      score += looksLikeUnavailableTitle(article.title) ? -10 : 0;

      const hardExcluded = looksLikeUnavailableTitle(article.title);
      const softExcluded =
        (queryTerms.length >= 2 && relevanceHits === 0) ||
        (!usefulAbstract && lowValuePublicationType) ||
        (likelyVeterinary && relevanceHits < 2);

      return {
        article,
        score,
        hardExcluded,
        softExcluded,
      };
    })
    .filter((item) => !item.hardExcluded)
    .sort((left, right) => right.score - left.score);

  const preferredArticles = rankedArticles.filter((item) => !item.softExcluded);
  const fallbackArticles = rankedArticles.filter((item) => item.softExcluded);
  const orderedArticles = [...preferredArticles, ...fallbackArticles]
    .map((item) => item.article)
    .slice(0, input.maxResults);

  return {
    query,
    executedQuery: term,
    total,
    articles: orderedArticles,
  };
}

function joinTextSegments(values: string[]) {
  return values
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function collectBodyParagraphs(node: unknown, lines: string[] = [], depth = 0): string[] {
  if (depth > 14 || node == null) return lines;

  if (typeof node === "string" || typeof node === "number") {
    const text = String(node).replace(/\s+/g, " ").trim();
    if (text.length >= 40) lines.push(text);
    return lines;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectBodyParagraphs(item, lines, depth + 1);
    }
    return lines;
  }

  if (typeof node !== "object") return lines;

  const record = node as Record<string, unknown>;
  const excludedKeys = new Set(["fig", "table-wrap", "table", "ref-list", "back", "floats-group", "supplementary-material"]);

  for (const [key, value] of Object.entries(record)) {
    if (excludedKeys.has(key)) continue;

    if (key === "title") {
      const titleText = textOf(value);
      if (titleText.length >= 8) {
        lines.push(titleText);
      }
      continue;
    }

    if (key === "p") {
      const paragraphs = ensureArray(value)
        .map((paragraph) => textOf(paragraph).replace(/\s+/g, " ").trim())
        .filter((paragraph) => paragraph.length >= 40);
      lines.push(...paragraphs);
      continue;
    }

    collectBodyParagraphs(value, lines, depth + 1);
  }

  return lines;
}

function trimFullText(value: string, maxLength = 20000) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n\n[Full text truncated for processing]`;
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

  const uniqueParagraphs = Array.from(new Set(paragraphs));
  return trimFullText(uniqueParagraphs.join("\n\n"));
}

function findPublisherFullTextCandidateUrls(article: Pick<LiteratureArticle, "url" | "fullTextUrl">) {
  return Array.from(new Set([article.fullTextUrl, article.url].filter((value): value is string => Boolean(value))));
}

async function fetchPublisherHtmlFullText(article: Pick<LiteratureArticle, "url" | "fullTextUrl" | "abstract">): Promise<FullTextResult | null> {
  const candidateUrls = findPublisherFullTextCandidateUrls(article);

  for (const candidateUrl of candidateUrls) {
    try {
      const response = await axios.get(candidateUrl, {
        timeout: 25000,
        maxRedirects: 5,
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (compatible; LaakarinTyopoyta/1.0; +https://github.com/kapiur/LaakarinTyopoyta)",
        },
      });

      const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
      if (!contentType.includes("html") && typeof response.data !== "string") {
        continue;
      }

      const html = typeof response.data === "string" ? response.data : "";
      if (!html.trim()) continue;

      const fullText = extractReadableHtmlText(html);
      if (fullText.length >= 1200) {
        return {
          fullText,
          fullTextUrl: candidateUrl,
          source: "publisher_html",
        };
      }
    } catch (error) {
      console.error("Publisher full text fetch failed:", {
        candidateUrl,
        error,
      });
    }
  }

  return null;
}

export async function fetchLiteratureFullText(
  article: Pick<LiteratureArticle, "pmcid" | "abstract" | "pmid" | "title" | "url" | "fullTextUrl">
): Promise<FullTextResult> {
  const pmcid = article.pmcid?.trim();

  if (pmcid) {
    try {
      const fetchResponse = await axios.get(PMC_EFETCH_URL, {
        params: {
          db: "pmc",
          id: pmcid,
          retmode: "xml",
        },
        timeout: 25000,
      });

      const parsed = xmlParser.parse(fetchResponse.data);
      const articleNode =
        parsed?.pmcarticleset?.article ??
        parsed?.article ??
        parsed?.["pmc-articleset"]?.article;

      const bodyNode = (articleNode as Record<string, unknown> | undefined)?.body;
      const bodyLines = collectBodyParagraphs(bodyNode);
      const bodyText = trimFullText(joinTextSegments(bodyLines));

      if (bodyText) {
        return {
          pmcid,
          fullText: bodyText,
          fullTextUrl: `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/`,
          source: "pmc",
        };
      }
    } catch (error) {
      console.error("PMC full text fetch failed:", {
        pmcid,
        pmid: article.pmid,
        error,
      });
    }
  }

  const publisherResult = await fetchPublisherHtmlFullText(article);
  if (publisherResult) {
    return {
      pmcid,
      ...publisherResult,
    };
  }

  return {
    pmcid,
    fullText: article.abstract,
    fullTextUrl: `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/`,
    source: "abstract_only",
  };
}
