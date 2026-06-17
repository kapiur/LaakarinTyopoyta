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
  const trimmed = content.trim();

  const candidates = [
    trimmed,
    trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim(),
  ];

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }

  return null;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function fallbackTranslationFromText(article: LiteratureArticle, content: string): LiteratureTranslationResult | null {
  const normalized = content.trim();
  if (!normalized) return null;

  const titleMatch = normalized.match(/translatedTitle\s*[:\-]\s*(.+)/i) ?? normalized.match(/title\s*[:\-]\s*(.+)/i);
  const abstractMatch = normalized.match(/translatedAbstract\s*[:\-]\s*([\s\S]+)/i) ?? normalized.match(/abstract\s*[:\-]\s*([\s\S]+)/i);

  if (titleMatch || abstractMatch) {
    return {
      translatedTitle: titleMatch?.[1]?.trim() || article.title,
      translatedAbstract: abstractMatch?.[1]?.trim() || normalized,
    };
  }

  return {
    translatedTitle: article.title,
    translatedAbstract: normalized,
  };
}

function fallbackSummaryFromText(article: LiteratureArticle, content: string): LiteratureSummaryResult | null {
  const normalized = content.trim();
  if (!normalized) return null;

  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  const summaryBullets = lines.slice(0, 4);
  const limitationsStartIndex = lines.findIndex((line) => /limit/i.test(line));
  const limitations =
    limitationsStartIndex >= 0
      ? lines.slice(limitationsStartIndex, Math.min(limitationsStartIndex + 3, lines.length))
      : [];

  return {
    localizedTitle: article.title,
    studyTypeLabel: article.studyType,
    summaryBullets,
    limitations,
    clinicalRelevance: lines.slice(summaryBullets.length, Math.min(summaryBullets.length + 2, lines.length)).join(" "),
    trustNote: article.trustReason,
  };
}

function translationFromParsed(article: LiteratureArticle, parsed: LiteratureTranslationResult | null, rawContent: string) {
  if (parsed?.translatedTitle || parsed?.translatedAbstract) {
    return {
      translatedTitle: parsed.translatedTitle || article.title,
      translatedAbstract: parsed.translatedAbstract || "",
    };
  }

  return fallbackTranslationFromText(article, rawContent);
}

function summaryFromParsed(article: LiteratureArticle, parsed: LiteratureSummaryResult | null, rawContent: string) {
  if (parsed?.localizedTitle || Array.isArray(parsed?.summaryBullets)) {
    return {
      localizedTitle: parsed?.localizedTitle || article.title,
      studyTypeLabel: parsed?.studyTypeLabel || article.studyType,
      summaryBullets: normalizeStringArray(parsed?.summaryBullets),
      limitations: normalizeStringArray(parsed?.limitations),
      clinicalRelevance: typeof parsed?.clinicalRelevance === "string" ? parsed.clinicalRelevance : "",
      trustNote: typeof parsed?.trustNote === "string" && parsed.trustNote.trim() ? parsed.trustNote : article.trustReason,
    };
  }

  return fallbackSummaryFromText(article, rawContent);
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
            "Return JSON only with keys translatedTitle and translatedAbstract. Do not use markdown fences.",
          ].join(" ")
        : [
            "You are a source-grounded medical literature summariser for physicians.",
            "Use only the provided article metadata and abstract.",
            "Do not invent study details, treatment advice, outcomes, or guideline conclusions that are not present in the input.",
            "Return JSON only with keys localizedTitle, studyTypeLabel, summaryBullets, limitations, clinicalRelevance, trustNote. Do not use markdown fences.",
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
      temperature: 0,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userInstruction },
      ],
    });

    if (mode === "translate") {
      const parsed = safeJsonParse<LiteratureTranslationResult>(result.content);
      const translation = translationFromParsed(article, parsed, result.content);
      if (!translation) {
        console.error("Literature translation parse failed:", {
          provider: result.provider,
          model: result.model,
          contentPreview: result.content.slice(0, 500),
        });
        return NextResponse.json({ error: "Translation parse failed" }, { status: 502 });
      }

      return NextResponse.json({
        provider: result.provider,
        model: result.model,
        translation,
      });
    }

    const parsed = safeJsonParse<LiteratureSummaryResult>(result.content);
    const summary = summaryFromParsed(article, parsed, result.content);
    if (!summary) {
      console.error("Literature summary parse failed:", {
        provider: result.provider,
        model: result.model,
        contentPreview: result.content.slice(0, 500),
      });
      return NextResponse.json({ error: "Summary parse failed" }, { status: 502 });
    }

    return NextResponse.json({
      provider: result.provider,
      model: result.model,
      summary,
    });
  } catch (routeError) {
    console.error("Literature interpretation failed:", routeError);
    return NextResponse.json({ error: "Literature interpretation failed" }, { status: 500 });
  }
}
