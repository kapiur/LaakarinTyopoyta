import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";
import { getUserClinicalEvidenceConfig } from "../../../../lib/clinical/evidence/userClinicalSettings";
import { runRoutedAiCompletion } from "../../../../lib/ai/runRoutedAiCompletion";
import type {
  LiteratureArticle,
  LiteratureInterpretationMode,
  LiteratureSummaryResult,
  LiteratureTranslationResult,
} from "../../../../lib/literature/types";

function isLiteratureMode(value: unknown): value is LiteratureInterpretationMode {
  return value === "translate" || value === "summary";
}

function safeJsonParse<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function buildArticleContext(article: LiteratureArticle) {
  return [
    `Title: ${article.title}`,
    `Journal: ${article.journal || "Unknown"}`,
    `Year: ${article.year || "Unknown"}`,
    `Source language: ${article.sourceLanguageLabel} (${article.sourceLanguage})`,
    `Study type: ${article.studyType}`,
    `Trust level: ${article.trustLevel}`,
    article.publicationTypes.length > 0 ? `Publication types: ${article.publicationTypes.join("; ")}` : "",
    article.abstract ? `Abstract:\n${truncateText(article.abstract, 8000)}` : "Abstract: not available",
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
    const mode = body?.mode;

    if (!article || !isLiteratureMode(mode) || !article.title) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const clinicalConfig = await getUserClinicalEvidenceConfig(userId);
    const targetLanguage = typeof body?.targetLanguage === "string" && body.targetLanguage.trim()
      ? body.targetLanguage.trim()
      : clinicalConfig.clinicalOutputLanguage;
    const articleContext = buildArticleContext(article);

    const systemInstruction =
      mode === "translate"
        ? [
            "You are a medical literature translation assistant.",
            "Translate only the provided article title and abstract into the requested target language.",
            "Do not add explanations, extra facts, or clinical advice.",
            "Preserve meaning conservatively and keep uncertainty exactly as in the source.",
            "Return valid JSON with keys translatedTitle and translatedAbstract.",
          ].join(" ")
        : [
            "You are a source-grounded medical literature summariser for physicians.",
            "Use only the provided article metadata and abstract.",
            "Do not invent study details, treatment advice, outcomes, or guideline conclusions that are not present in the input.",
            "Return valid JSON with keys localizedTitle, studyTypeLabel, summaryBullets, limitations, clinicalRelevance, trustNote.",
            "summaryBullets and limitations must be arrays of short strings.",
          ].join(" ");

    const userInstruction =
      mode === "translate"
        ? `Target language: ${targetLanguage}\n\nTranslate the title and abstract faithfully.\n\n${articleContext}`
        : [
            `Target language: ${targetLanguage}`,
            `Clinical country: ${clinicalConfig.clinicalCountry}`,
            "Create a concise article brief for a physician.",
            "Include main findings only if they are clearly grounded in the abstract.",
            "Mention uncertainty when details are missing.",
            articleContext,
          ].join("\n\n");

    const result = await runRoutedAiCompletion({
      userId,
      taskType: mode === "translate" ? "translation" : "clinical_reference",
      responseFormat: "json",
      temperature: 0,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userInstruction },
      ],
    });

    if (mode === "translate") {
      const parsed = safeJsonParse<LiteratureTranslationResult>(result.content);
      if (!parsed?.translatedTitle && !parsed?.translatedAbstract) {
        return NextResponse.json({ error: "Translation parse failed" }, { status: 502 });
      }

      return NextResponse.json({
        provider: result.provider,
        model: result.model,
        translation: {
          translatedTitle: parsed.translatedTitle || article.title,
          translatedAbstract: parsed.translatedAbstract || "",
        },
      });
    }

    const parsed = safeJsonParse<LiteratureSummaryResult>(result.content);
    if (!parsed?.localizedTitle && !Array.isArray(parsed?.summaryBullets)) {
      return NextResponse.json({ error: "Summary parse failed" }, { status: 502 });
    }

    return NextResponse.json({
      provider: result.provider,
      model: result.model,
      summary: {
        localizedTitle: parsed.localizedTitle || article.title,
        studyTypeLabel: parsed.studyTypeLabel || article.studyType,
        summaryBullets: Array.isArray(parsed.summaryBullets) ? parsed.summaryBullets.filter(Boolean) : [],
        limitations: Array.isArray(parsed.limitations) ? parsed.limitations.filter(Boolean) : [],
        clinicalRelevance: parsed.clinicalRelevance || "",
        trustNote: parsed.trustNote || article.trustReason,
      },
    });
  } catch (routeError) {
    console.error("Literature interpretation failed:", routeError);
    return NextResponse.json({ error: "Literature interpretation failed" }, { status: 500 });
  }
}
