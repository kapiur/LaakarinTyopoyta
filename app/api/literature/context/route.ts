import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";
import { fetchLiteratureFullText } from "../../../../lib/literature/pubmed";
import type { LiteratureArticle, LiteratureInterpretationMode } from "../../../../lib/literature/types";

function splitParagraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function looksLikeHeading(paragraph: string) {
  if (paragraph.length < 3 || paragraph.length > 80) return false;
  if (/[.!?]$/.test(paragraph)) return false;
  const wordCount = paragraph.split(/\s+/).length;
  return wordCount <= 8;
}

function normalizeHeading(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function sectionKeyForHeading(heading: string) {
  const normalized = normalizeHeading(heading);
  if (/(method|materials|patients and methods|study design|statistical analysis)/.test(normalized)) return "methods";
  if (/(result|finding|outcome)/.test(normalized)) return "results";
  if (/(discussion|interpretation)/.test(normalized)) return "discussion";
  if (/(conclusion|conclusions|summary)/.test(normalized)) return "conclusion";
  if (/(background|introduction|objective|aim)/.test(normalized)) return "introduction";
  return "other";
}

function buildSummaryFocusedExcerpt(fullText: string) {
  const paragraphs = splitParagraphs(fullText);
  if (paragraphs.length === 0) return "";

  const buckets: Record<string, string[]> = {
    introduction: [],
    methods: [],
    results: [],
    discussion: [],
    conclusion: [],
    other: [],
  };

  let currentSection: keyof typeof buckets = "other";
  for (const paragraph of paragraphs) {
    if (looksLikeHeading(paragraph)) {
      currentSection = sectionKeyForHeading(paragraph) as keyof typeof buckets;
      buckets[currentSection].push(paragraph);
      continue;
    }
    buckets[currentSection].push(paragraph);
  }

  const orderedSections: Array<keyof typeof buckets> = [
    "introduction",
    "methods",
    "results",
    "discussion",
    "conclusion",
    "other",
  ];

  const excerptParts: string[] = [];
  let totalChars = 0;
  const maxChars = 24000;

  for (const section of orderedSections) {
    const items = buckets[section];
    if (items.length === 0) continue;

    let taken = 0;
    for (const item of items) {
      if (totalChars >= maxChars) break;
      if (taken >= 6 && section !== "results") break;
      if (taken >= 10 && section === "results") break;

      const next = item.trim();
      if (!next) continue;

      if (totalChars + next.length > maxChars && totalChars > Math.floor(maxChars * 0.7)) {
        break;
      }

      excerptParts.push(next);
      totalChars += next.length + 2;
      taken += 1;
    }
  }

  return excerptParts.join("\n\n").trim() || paragraphs.slice(0, 20).join("\n\n");
}

function buildArticleContext(
  article: LiteratureArticle,
  fullText: string,
  fullTextSource: "pmc" | "publisher_html" | "abstract_only",
  mode: LiteratureInterpretationMode
) {
  const sourceLabel =
    fullTextSource === "pmc"
      ? "PMC full text"
      : fullTextSource === "publisher_html"
        ? "Publisher/open-web full text"
        : "Abstract only";

  const interpretationText =
    mode === "summary" && fullTextSource !== "abstract_only"
      ? buildSummaryFocusedExcerpt(fullText)
      : fullText;

  return [
    `Title: ${article.title}`,
    article.journal ? `Journal: ${article.journal}` : "",
    article.year ? `Year: ${article.year}` : "",
    `Source language: ${article.sourceLanguageLabel} (${article.sourceLanguage})`,
    `Study type: ${article.studyType}`,
    article.publicationTypes.length > 0 ? `Publication types: ${article.publicationTypes.join(", ")}` : "",
    `Trust level: ${article.trustLevel}`,
    article.abstract ? `Abstract:\n${article.abstract}` : "Abstract: not available",
    interpretationText
      ? `Full text source: ${sourceLabel}\n\nText for interpretation:\n${interpretationText}`
      : "",
  ].filter(Boolean).join("\n\n");
}

export async function POST(req: Request) {
  const { error } = await requireAuthenticatedUser();
  if (error) return error;

  try {
    const body = await req.json();
    const article = body?.article as LiteratureArticle | undefined;
    const mode: LiteratureInterpretationMode = body?.mode === "translate" ? "translate" : "summary";

    if (!article?.pmid || !article.title) {
      return NextResponse.json({ error: "Invalid article" }, { status: 400 });
    }

    const fullTextResult = await fetchLiteratureFullText(article);

    return NextResponse.json({
      contextText: buildArticleContext(article, fullTextResult.fullText, fullTextResult.source, mode),
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
