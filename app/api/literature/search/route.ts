import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";
import { getUserClinicalEvidenceConfig } from "../../../../lib/clinical/evidence/userClinicalSettings";
import { searchPubMedArticles } from "../../../../lib/literature/pubmed";
import type { LiteratureStudyFilter } from "../../../../lib/literature/types";

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
    const maxResults = Math.max(1, Math.min(20, Number(url.searchParams.get("maxResults") ?? "12")));

    if (!query) {
      return NextResponse.json({
        query: "",
        total: 0,
        articles: [],
      });
    }

    const [clinicalConfig, searchResult] = await Promise.all([
      getUserClinicalEvidenceConfig(userId),
      searchPubMedArticles({ query, yearsBack, maxResults, studyFilter }),
    ]);

    return NextResponse.json({
      ...searchResult,
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
            language: source.language,
          })),
      },
    });
  } catch (routeError) {
    console.error("Literature search failed:", routeError);
    return NextResponse.json({ error: "Literature search failed" }, { status: 500 });
  }
}
