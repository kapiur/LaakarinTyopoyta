import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";
import { fetchLiteratureFullText } from "../../../../lib/literature/pubmed";
import type { LiteratureArticle } from "../../../../lib/literature/types";

function buildArticleContext(article: LiteratureArticle, fullText: string, fullTextSource: "pmc" | "publisher_html" | "abstract_only") {
  const sourceLabel =
    fullTextSource === "pmc"
      ? "PMC full text"
      : fullTextSource === "publisher_html"
        ? "Publisher/open-web full text"
        : "Abstract only";

  return [
    `Title: ${article.title}`,
    article.journal ? `Journal: ${article.journal}` : "",
    article.year ? `Year: ${article.year}` : "",
    `Source language: ${article.sourceLanguageLabel} (${article.sourceLanguage})`,
    `Study type: ${article.studyType}`,
    article.publicationTypes.length > 0 ? `Publication types: ${article.publicationTypes.join(", ")}` : "",
    `Trust level: ${article.trustLevel}`,
    article.abstract ? `Abstract:\n${article.abstract}` : "Abstract: not available",
    fullText
      ? `Full text source: ${sourceLabel}\n\nFull text for interpretation:\n${fullText}`
      : "",
  ].filter(Boolean).join("\n\n");
}

export async function POST(req: Request) {
  const { error } = await requireAuthenticatedUser();
  if (error) return error;

  try {
    const body = await req.json();
    const article = body?.article as LiteratureArticle | undefined;

    if (!article?.pmid || !article.title) {
      return NextResponse.json({ error: "Invalid article" }, { status: 400 });
    }

    const fullTextResult = await fetchLiteratureFullText(article);

    return NextResponse.json({
      contextText: buildArticleContext(article, fullTextResult.fullText, fullTextResult.source),
      fullTextAvailable: fullTextResult.source !== "abstract_only",
      fullTextSource: fullTextResult.source,
      fullTextUrl: fullTextResult.fullTextUrl ?? article.fullTextUrl ?? null,
      pmcid: fullTextResult.pmcid ?? article.pmcid ?? null,
    });
  } catch (routeError) {
    console.error("Literature context build failed:", routeError);
    return NextResponse.json({ error: "Literature context build failed" }, { status: 500 });
  }
}
