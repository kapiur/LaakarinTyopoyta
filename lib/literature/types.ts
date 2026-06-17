export type LiteratureStudyFilter = "all" | "guideline" | "review" | "trial" | "observational";

export type LiteratureTrustLevel = "high" | "moderate" | "low" | "preliminary" | "unknown";

export type LiteratureArticle = {
  pmid: string;
  title: string;
  abstract: string;
  journal?: string;
  year?: string;
  doi?: string;
  url: string;
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
  total: number;
  articles: LiteratureArticle[];
};

export type LiteratureInterpretationMode = "translate" | "summary";

export type LiteratureTranslationResult = {
  translatedTitle: string;
  translatedAbstract: string;
};

export type LiteratureSummaryResult = {
  localizedTitle: string;
  studyTypeLabel: string;
  summaryBullets: string[];
  limitations: string[];
  clinicalRelevance: string;
  trustNote: string;
};
