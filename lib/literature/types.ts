import type { ClinicalCountryCode } from "../clinical/countries/countryRegistry";

export type LiteratureStudyFilter = "all" | "guideline" | "review" | "trial" | "observational";
export type LiteratureRegionFilter = "all" | "us" | "europe";
export type LiteratureSearchSort = "relevance" | "newest" | "highest_evidence";
export type LiteratureTrustFilter = "all" | "high" | "moderate";

export type LiteratureTrustLevel = "high" | "moderate" | "low" | "preliminary" | "unknown";

export type LiteratureArticle = {
  pmid: string;
  pmcid?: string;
  title: string;
  abstract: string;
  journal?: string;
  year?: string;
  doi?: string;
  url: string;
  fullTextUrl?: string;
  fullTextAvailable?: boolean;
  authors: string[];
  sourceLanguage: string;
  sourceLanguageLabel: string;
  publicationTypes: string[];
  studyType: string;
  trustLevel: LiteratureTrustLevel;
  trustReason: string;
};

export type LiteratureSearchResult = {
  query: string;
  executedQuery?: string;
  total: number;
  articles: LiteratureArticle[];
};

export type LiteratureInterpretationMode = "translate" | "summary";

export type LiteratureTranslationResult = {
  translatedTitle: string;
  translatedAbstract: string;
  translatedText?: string;
};

export type LiteratureSummaryResult = {
  localizedTitle: string;
  studyTypeLabel: string;
  summaryBullets: string[];
  limitations: string[];
  clinicalRelevance: string;
  trustNote: string;
  summaryText?: string;
};

export type LiteratureGuidelineComparisonStatus =
  | "aligned"
  | "partially_aligned"
  | "unclear"
  | "not_found";

export type LiteratureGuidelineComparisonSource = {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceTitle: string;
  excerpt?: string;
  matchReason: string;
  publishedAt?: string;
  retrievedText: boolean;
};

export type LiteratureGuidelineComparisonResult = {
  status: LiteratureGuidelineComparisonStatus;
  verdict: string;
  comparisonSummary: string;
  agreementPoints: string[];
  cautionPoints: string[];
  suggestedChecks: string[];
  searchQuery: string;
  clinicalCountry: ClinicalCountryCode;
  displayLanguage: string;
  sources: LiteratureGuidelineComparisonSource[];
};
