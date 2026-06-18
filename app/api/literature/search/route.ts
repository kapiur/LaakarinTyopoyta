import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";
import { getUserClinicalEvidenceConfig } from "../../../../lib/clinical/evidence/userClinicalSettings";
import { searchPubMedArticles } from "../../../../lib/literature/pubmed";
import { rewriteLiteratureSearchQuery } from "../../../../lib/literature/queryRewrite";
import type {
  LiteratureRegionFilter,
  LiteratureSearchSort,
  LiteratureStudyFilter,
  LiteratureTrustFilter,
} from "../../../../lib/literature/types";

function normalizeStudyFilter(value: unknown): LiteratureStudyFilter {
  if (
    value === "guideline" ||
    value === "review" ||
    value === "trial" ||
    value === "observational"
  ) {
    return value;
  }
  return "all";
}

function normalizeYearsBack(value: string | null) {
  if (!value) return 5;
  if (value === "all") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(1, Math.min(50, parsed));
}

function normalizeRegionFilter(value: unknown): LiteratureRegionFilter {
  if (value === "us" || value === "europe") {
    return value;
  }
  return "all";
}

function normalizeSortBy(value: unknown): LiteratureSearchSort {
  if (value === "newest" || value === "highest_evidence") {
    return value;
  }
  return "relevance";
}

function normalizeTrustFilter(value: unknown): LiteratureTrustFilter {
  if (value === "high" || value === "moderate") {
    return value;
  }
  return "all";
}

function normalizeBoolean(value: string | null) {
  return value === "true";
}

export async function GET(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const query = (url.searchParams.get("q") ?? "").trim();
    const yearsBack = normalizeYearsBack(url.searchParams.get("yearsBack"));
    const studyFilter = normalizeStudyFilter(url.searchParams.get("studyFilter"));
    const regionFilter = normalizeRegionFilter(url.searchParams.get("regionFilter"));
    const sortBy = normalizeSortBy(url.searchParams.get("sortBy"));
    const trustFilter = normalizeTrustFilter(url.searchParams.get("trustFilter"));
    const fullTextOnly = normalizeBoolean(url.searchParams.get("fullTextOnly"));
    const maxResults = Math.max(1, Math.min(60, Number(url.searchParams.get("maxResults") ?? "12")));

    if (!query) {
      return NextResponse.json({
        query: "",
        executedQuery: "",
        total: 0,
        articles: [],
      });
    }

    const rewrittenQuery = await rewriteLiteratureSearchQuery({
      userId,
      query,
      studyFilter,
    });

    const [clinicalConfig, searchResult] = await Promise.all([
      getUserClinicalEvidenceConfig(userId),
      searchPubMedArticles({
        query: rewrittenQuery,
        yearsBack,
        maxResults,
        studyFilter,
        regionFilter,
        sortBy,
        trustFilter,
        fullTextOnly,
      }),
    ]);

    return NextResponse.json({
      ...searchResult,
      query,
      executedQuery: rewrittenQuery,
      context: {
        practiceCountry: clinicalConfig.practiceCountry,
        clinicalCountry: clinicalConfig.clinicalCountry,
        targetLanguage: clinicalConfig.clinicalOutputLanguage,
        officialSources: clinicalConfig.allowedSources
          .filter((source) => source.isOfficial)
          .map((source) => ({
            id: source.id,
            name: source.name,
            trustLevel: source.trustLevel,
            baseUrl: source.baseUrl,
            language: source.language,
          })),
      },
    });
  } catch (routeError) {
    console.error("Literature search failed:", routeError);
    return NextResponse.json({ error: "Literature search failed" }, { status: 500 });
  }
}
