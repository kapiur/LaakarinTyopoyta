import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import type { LiteratureArticle, LiteratureSearchResult, LiteratureStudyFilter, LiteratureTrustLevel } from "./types";

const PUBMED_ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const PUBMED_EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

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

type SearchPubMedInput = {
  query: string;
  yearsBack: number | null;
  maxResults: number;
  studyFilter: LiteratureStudyFilter;
};

export async function searchPubMedArticles(input: SearchPubMedInput): Promise<LiteratureSearchResult> {
  const query = input.query.trim();
  if (!query) {
    return { query: "", total: 0, articles: [] };
  }

  const searchTermClause = buildStudyFilterClause(input.studyFilter);
  const term = searchTermClause ? `(${query}) AND ${searchTermClause}` : query;
  const currentYear = new Date().getUTCFullYear();
  const params: Record<string, string | number> = {
    db: "pubmed",
    retmode: "json",
    retmax: input.maxResults,
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

  const articles: LiteratureArticle[] = rawArticles.map((raw) => {
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
    const { trustLevel, trustReason } = getTrust(publicationTypes);

    return {
      pmid,
      title,
      abstract,
      journal: textOf(article?.Journal && (article.Journal as Record<string, unknown>).Title),
      year: extractYear(article),
      doi: doi || undefined,
      url: doi ? `https://doi.org/${doi}` : `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      authors: extractAuthors(article?.AuthorList),
      sourceLanguage,
      sourceLanguageLabel: getLanguageLabel(sourceLanguageRaw),
      publicationTypes,
      studyType: getStudyType(publicationTypes),
      trustLevel,
      trustReason,
    };
  }).filter((article) => article.pmid && article.title);

  return {
    query,
    total,
    articles,
  };
}
