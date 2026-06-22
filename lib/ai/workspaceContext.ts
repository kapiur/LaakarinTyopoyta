import { getClinicalCountryConfig, type ClinicalCountryCode } from "../clinical/countries/countryRegistry";
import { getUserClinicalEvidenceConfig, type UserClinicalEvidenceConfig } from "../clinical/evidence/userClinicalSettings";
import { normalizeUiLanguage, type UiLanguage } from "../i18n";
import { prisma } from "../prisma";

export type AiWorkspaceContext = {
  uiLanguage: UiLanguage;
  practiceCountry: string;
  clinicalCountry: ClinicalCountryCode;
  clinicalOutputLanguage: string;
  evidenceStrictness: UserClinicalEvidenceConfig["evidenceStrictness"];
};

type ResolvedResponseLanguageSource =
  | "explicit_user_request"
  | "structured_user_setting"
  | "inferred_from_request"
  | "fallback_ui_language"
  | "fallback_clinical_language";

export function languageLabel(code: string) {
  const normalized = code.trim().toLowerCase();
  if (normalized === "fi") return "Finnish";
  if (normalized === "ru") return "Russian";
  if (normalized === "en") return "English";
  if (normalized === "de") return "German";
  if (normalized === "sv") return "Swedish";
  return code;
}

const EXPLICIT_RESPONSE_LANGUAGE_PATTERNS: Array<{ code: string; patterns: RegExp[] }> = [
  {
    code: "fi",
    patterns: [
      /\b(?:answer|reply|respond|write)(?:\s+\w+){0,4}\s+in\s+finnish\b/i,
      /\b(?:ответь|отвечай|напиши|пиши|сформулируй)(?:.{0,40})\b(?:на финском|по-?фински)\b/i,
      /\b(?:suomeksi|vastaa suomeksi|kirjoita suomeksi)\b/i,
      /\bauf finnisch\b/i,
    ],
  },
  {
    code: "ru",
    patterns: [
      /\b(?:answer|reply|respond|write)(?:\s+\w+){0,4}\s+in\s+russian\b/i,
      /\b(?:ответь|отвечай|напиши|пиши|сформулируй)(?:.{0,40})\b(?:на русском|по-?русски)\b/i,
      /\b(?:venaejaeksi|venäjäksi|vastaa venäjäksi|kirjoita venäjäksi)\b/i,
      /\bauf russisch\b/i,
    ],
  },
  {
    code: "en",
    patterns: [
      /\b(?:answer|reply|respond|write)(?:\s+\w+){0,4}\s+in\s+english\b/i,
      /\b(?:ответь|отвечай|напиши|пиши|сформулируй)(?:.{0,40})\b(?:на английском|по-?английски)\b/i,
      /\b(?:englanniksi|vastaa englanniksi|kirjoita englanniksi)\b/i,
      /\bauf englisch\b/i,
    ],
  },
  {
    code: "de",
    patterns: [
      /\b(?:answer|reply|respond|write)(?:\s+\w+){0,4}\s+in\s+german\b/i,
      /\b(?:ответь|отвечай|напиши|пиши|сформулируй)(?:.{0,40})\b(?:на немецком|по-?немецки)\b/i,
      /\b(?:saksaksi|vastaa saksaksi|kirjoita saksaksi)\b/i,
      /\bauf deutsch\b/i,
    ],
  },
];

const REQUEST_LANGUAGE_HEURISTICS: Array<{ code: UiLanguage; patterns: RegExp[]; bonus?: RegExp[] }> = [
  {
    code: "ru",
    patterns: [
      /\b(?:что|как|сделай|переведи|ответь|сравни|кратко|почему|жалоб|пациент|боль|температур|одышк|гипертони)\b/gi,
    ],
    bonus: [/[а-яё]/i],
  },
  {
    code: "fi",
    patterns: [
      /\b(?:ja|ei|potilas|kipu|kuume|yskä|alaselkäkipu|kirjoita|vastaa|lyhyesti|suomeksi|virtsaaminen|rintakipu)\b/gi,
    ],
    bonus: [/[äö]/i],
  },
  {
    code: "de",
    patterns: [
      /\b(?:und|nicht|schmerz|patient|bitte|kurz|deutsch|antwort|fieber|husten|blutdruck)\b/gi,
    ],
    bonus: [/[äöüß]/i],
  },
  {
    code: "en",
    patterns: [
      /\b(?:what|how|please|answer|write|patient|pain|fever|cough|short|blood|pressure|hypertension)\b/gi,
    ],
  },
];

function countMatches(text: string, pattern: RegExp) {
  const matches = text.match(pattern);
  return matches?.length ?? 0;
}

export function detectExplicitResponseLanguagePreference(text: string): string | null {
  const normalizedText = text.trim();
  if (!normalizedText) return null;

  for (const candidate of EXPLICIT_RESPONSE_LANGUAGE_PATTERNS) {
    if (candidate.patterns.some((pattern) => pattern.test(normalizedText))) {
      return candidate.code;
    }
  }

  return null;
}

export function inferRequestLanguage(text: string): UiLanguage | null {
  const normalizedText = text.trim();
  if (!normalizedText) return null;

  const scores = new Map<UiLanguage, number>();

  for (const candidate of REQUEST_LANGUAGE_HEURISTICS) {
    const score =
      candidate.patterns.reduce((sum, pattern) => sum + countMatches(normalizedText, pattern), 0) +
      (candidate.bonus?.some((pattern) => pattern.test(normalizedText)) ? 2 : 0);

    if (score > 0) {
      scores.set(candidate.code, score);
    }
  }

  const ranked = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;

  const [topCode, topScore] = ranked[0];
  const secondScore = ranked[1]?.[1] ?? 0;

  if (topScore < 2 || topScore === secondScore) {
    return null;
  }

  return topCode;
}

export function resolveResponseLanguage(input: {
  userRequestText?: string;
  preferredLanguage?: string | null;
  preferredMode?: "request" | "fixed" | null;
  fallbackUiLanguage?: UiLanguage;
  fallbackClinicalLanguage?: string;
}) {
  const userRequestText = input.userRequestText?.trim() ?? "";
  const explicitLanguage = detectExplicitResponseLanguagePreference(userRequestText);
  if (explicitLanguage) {
    return {
      language: explicitLanguage,
      source: "explicit_user_request" as ResolvedResponseLanguageSource,
    };
  }

  if (input.preferredMode === "fixed" && input.preferredLanguage?.trim()) {
    return {
      language: input.preferredLanguage.trim().toLowerCase(),
      source: "structured_user_setting" as ResolvedResponseLanguageSource,
    };
  }

  const inferredLanguage = inferRequestLanguage(userRequestText);
  if (inferredLanguage) {
    return {
      language: inferredLanguage,
      source: "inferred_from_request" as ResolvedResponseLanguageSource,
    };
  }

  if (input.fallbackUiLanguage) {
    return {
      language: input.fallbackUiLanguage,
      source: "fallback_ui_language" as ResolvedResponseLanguageSource,
    };
  }

  return {
    language: input.fallbackClinicalLanguage?.trim() || "en",
    source: "fallback_clinical_language" as ResolvedResponseLanguageSource,
  };
}

function clinicalCountryLabel(country: ClinicalCountryCode) {
  return getClinicalCountryConfig(country).name.en ?? country;
}

export async function getUserAiWorkspaceContext(
  userId: number,
  options?: { clinicalConfig?: Pick<UserClinicalEvidenceConfig, "practiceCountry" | "clinicalCountry" | "clinicalOutputLanguage" | "evidenceStrictness"> },
): Promise<AiWorkspaceContext> {
  const [user, loadedClinicalConfig] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { uiLanguage: true },
    }),
    options?.clinicalConfig
      ? Promise.resolve(options.clinicalConfig)
      : getUserClinicalEvidenceConfig(userId),
  ]);

  const clinicalConfig = loadedClinicalConfig;

  return {
    uiLanguage: normalizeUiLanguage(user?.uiLanguage),
    practiceCountry: clinicalConfig.practiceCountry,
    clinicalCountry: clinicalConfig.clinicalCountry,
    clinicalOutputLanguage: clinicalConfig.clinicalOutputLanguage,
    evidenceStrictness: clinicalConfig.evidenceStrictness,
  };
}

export function buildWorkspaceContextInstruction(
  context: AiWorkspaceContext,
  options?: {
    includeUiLanguage?: boolean;
    mentionCountryAdaptation?: boolean;
    preserveExistingLanguage?: boolean;
    contentLabel?: string;
  },
) {
  const includeUiLanguage = options?.includeUiLanguage ?? true;
  const mentionCountryAdaptation = options?.mentionCountryAdaptation ?? true;
  const preserveExistingLanguage = options?.preserveExistingLanguage ?? false;
  const contentLabel = options?.contentLabel ?? "clinician-facing clinical output";

  const lines = [
    "Workspace context:",
    includeUiLanguage ? `- UI language: ${languageLabel(context.uiLanguage)} (${context.uiLanguage}).` : "",
    `- Practice country: ${clinicalCountryLabel(context.practiceCountry as ClinicalCountryCode)} (${context.practiceCountry}).`,
    `- Clinical country: ${clinicalCountryLabel(context.clinicalCountry)} (${context.clinicalCountry}).`,
    `- Clinical output language: ${languageLabel(context.clinicalOutputLanguage)} (${context.clinicalOutputLanguage}).`,
    `- Evidence mode: ${context.evidenceStrictness}.`,
    preserveExistingLanguage
      ? `- Preserve the language of the existing text unless the user explicitly asks to switch it. If you need to choose a default language for new ${contentLabel}, use ${languageLabel(context.clinicalOutputLanguage)}.`
      : `- By default, answer in the language of the user's current request. If the user explicitly asks for another language, use that. If the request does not clearly establish a language and you need to generate new ${contentLabel}, use ${languageLabel(context.clinicalOutputLanguage)}.`,
    mentionCountryAdaptation
      ? `- Adapt terminology, documentation style, care-setting assumptions, regulatory framing and recommendation context to ${clinicalCountryLabel(context.clinicalCountry)} when clinically relevant.`
      : "",
    includeUiLanguage
      ? `- If you need to write UI-level explanations, labels or user-facing meta comments outside the main clinical content, use ${languageLabel(context.uiLanguage)}.`
      : "",
  ].filter(Boolean);

  return lines.join("\n");
}
