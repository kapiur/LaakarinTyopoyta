import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";
import { getUserClinicalEvidenceConfig } from "../../../../lib/clinical/evidence/userClinicalSettings";
import { compareArticleWithGuidelines } from "../../../../lib/literature/guidelineCompare";
import { fetchLiteratureFullText } from "../../../../lib/literature/pubmed";
import type { LiteratureArticle } from "../../../../lib/literature/types";

function buildArticleComparisonContext(article: LiteratureArticle, fullText: string, source: "pmc" | "publisher_html" | "abstract_only") {
  const sourceLabel =
    source === "pmc"
      ? "PMC full text"
      : source === "publisher_html"
        ? "Publisher/open-web full text"
        : "Abstract only";

  const primaryText = fullText.trim() || article.abstract.trim();

  return [
    `Title: ${article.title}`,
    article.journal ? `Journal: ${article.journal}` : "",
    article.year ? `Year: ${article.year}` : "",
    `Source language: ${article.sourceLanguageLabel} (${article.sourceLanguage})`,
    `Study type: ${article.studyType}`,
    `Trust level: ${article.trustLevel}`,
    article.abstract ? `Abstract:\n${article.abstract}` : "Abstract: not available",
    `Retrieved article text source: ${sourceLabel}`,
    primaryText ? `Article text for comparison:\n${primaryText}` : "",
  ].filter(Boolean).join("\n\n");
}

export async function POST(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const article = body?.article as LiteratureArticle | undefined;
    const query = typeof body?.query === "string" ? body.query : undefined;
    const displayLanguage = typeof body?.displayLanguage === "string" ? body.displayLanguage : "en";

    if (!article?.pmid || !article?.title) {
      return NextResponse.json({ error: "Invalid article" }, { status: 400 });
    }

    const [clinicalConfig, fullTextResult] = await Promise.all([
      getUserClinicalEvidenceConfig(userId),
      fetchLiteratureFullText(article),
    ]);

    const comparison = await compareArticleWithGuidelines({
      userId,
      article,
      articleContextText: buildArticleComparisonContext(article, fullTextResult.fullText, fullTextResult.source),
      searchQuery: query,
      displayLanguage,
      clinicalConfig,
    });

    return NextResponse.json({ comparison });
  } catch (routeError) {
    console.error("Literature guideline comparison failed:", routeError);
    return NextResponse.json({ error: "Literature guideline comparison failed" }, { status: 500 });
  }
}
