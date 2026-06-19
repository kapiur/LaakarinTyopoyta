import { getClinicalCountryConfig, type ClinicalCountryCode } from "../clinical/countries/countryRegistry";
import { getUserClinicalEvidenceConfig } from "../clinical/evidence/userClinicalSettings";
import { normalizeUiLanguage, type UiLanguage } from "../i18n";
import { prisma } from "../prisma";

export type AiWorkspaceContext = {
  uiLanguage: UiLanguage;
  clinicalCountry: ClinicalCountryCode;
  clinicalOutputLanguage: string;
};

function languageLabel(code: string) {
  const normalized = code.trim().toLowerCase();
  if (normalized === "fi") return "Finnish";
  if (normalized === "ru") return "Russian";
  if (normalized === "en") return "English";
  if (normalized === "de") return "German";
  if (normalized === "sv") return "Swedish";
  return code;
}

function clinicalCountryLabel(country: ClinicalCountryCode) {
  return getClinicalCountryConfig(country).name.en ?? country;
}

export async function getUserAiWorkspaceContext(userId: number): Promise<AiWorkspaceContext> {
  const [user, clinicalConfig] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { uiLanguage: true },
    }),
    getUserClinicalEvidenceConfig(userId),
  ]);

  return {
    uiLanguage: normalizeUiLanguage(user?.uiLanguage),
    clinicalCountry: clinicalConfig.clinicalCountry,
    clinicalOutputLanguage: clinicalConfig.clinicalOutputLanguage,
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
    `- Clinical country: ${clinicalCountryLabel(context.clinicalCountry)} (${context.clinicalCountry}).`,
    `- Clinical output language: ${languageLabel(context.clinicalOutputLanguage)} (${context.clinicalOutputLanguage}).`,
    preserveExistingLanguage
      ? `- Preserve the language of the existing text unless the user explicitly asks to switch it. If you need to choose a default language for new ${contentLabel}, use ${languageLabel(context.clinicalOutputLanguage)}.`
      : `- Unless the user or the task explicitly requires another language, ${contentLabel} must be in ${languageLabel(context.clinicalOutputLanguage)}.`,
    mentionCountryAdaptation
      ? `- Adapt terminology, documentation style, care-setting assumptions, regulatory framing and recommendation context to ${clinicalCountryLabel(context.clinicalCountry)} when clinically relevant.`
      : "",
    includeUiLanguage
      ? `- If you need to write UI-level explanations, labels or user-facing meta comments outside the main clinical content, use ${languageLabel(context.uiLanguage)}.`
      : "",
  ].filter(Boolean);

  return lines.join("\n");
}
