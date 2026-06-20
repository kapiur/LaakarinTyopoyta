import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { SUPPORTED_UI_LANGUAGES, isSupportedUiLanguage, normalizeUiLanguage } from "../../../../lib/i18n/config";
import {
  DEFAULT_PRACTICE_COUNTRY,
  PRACTICE_COUNTRIES,
  getPracticeCountryDefaults,
  normalizePracticeCountry,
} from "../../../../lib/clinical/practice/practiceCountryRegistry";
import { ensureClinicalSourceSeeds } from "../../../../lib/clinical/sources/ensureClinicalSources";
import { applyCountryDefaultSourcePreferences } from "../../../../lib/clinical/sources/applyCountryDefaultSourcePreferences";

type StarterTarget = "home" | "text" | "guides" | "literature" | "calculators" | "templates";

const STARTER_TARGETS: Record<StarterTarget, string> = {
  home: "/",
  text: "/",
  guides: "/pikaohjeet-v2",
  literature: "/literature",
  calculators: "/calculators",
  templates: "/malli",
};

function getUserId(session: unknown) {
  const userId = Number((session as any)?.user?.id);
  return Number.isFinite(userId) ? userId : null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      uiLanguage: true,
      onboardingCompletedAt: true,
      clinicalSettings: {
        select: {
          practiceCountry: true,
          usePracticeCountryDefaults: true,
        },
      },
    },
  });

  const practiceCountry = normalizePracticeCountry(user?.clinicalSettings?.practiceCountry ?? DEFAULT_PRACTICE_COUNTRY);
  const defaults = getPracticeCountryDefaults(practiceCountry);

  return NextResponse.json({
    completed: Boolean(user?.onboardingCompletedAt),
    settings: {
      practiceCountry,
      usePracticeCountryDefaults: user?.clinicalSettings?.usePracticeCountryDefaults ?? true,
      uiLanguage: normalizeUiLanguage(user?.uiLanguage ?? defaults.defaultUiLanguage),
    },
    countries: PRACTICE_COUNTRIES,
    interfaceLanguages: SUPPORTED_UI_LANGUAGES,
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const practiceCountry = normalizePracticeCountry(body?.practiceCountry);
    const usePracticeCountryDefaults = body?.usePracticeCountryDefaults !== false;
    const requestedLanguage = body?.uiLanguage;
    const starterTarget = body?.starterTarget as StarterTarget;
    const defaults = getPracticeCountryDefaults(practiceCountry);
    const uiLanguage = usePracticeCountryDefaults
      ? defaults.defaultUiLanguage
      : isSupportedUiLanguage(requestedLanguage)
        ? requestedLanguage
        : normalizeUiLanguage(defaults.defaultUiLanguage);

    await ensureClinicalSourceSeeds();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          uiLanguage,
          onboardingCompletedAt: new Date(),
        },
      });

      await tx.userClinicalSettings.upsert({
        where: { userId },
        update: {
          practiceCountry,
          usePracticeCountryDefaults,
          clinicalCountry: defaults.defaultClinicalCountry,
          clinicalOutputLanguage: defaults.defaultClinicalOutputLanguage,
          evidenceStrictness: defaults.defaultEvidenceStrictness,
        },
        create: {
          userId,
          practiceCountry,
          usePracticeCountryDefaults,
          clinicalCountry: defaults.defaultClinicalCountry,
          clinicalOutputLanguage: defaults.defaultClinicalOutputLanguage,
          evidenceStrictness: defaults.defaultEvidenceStrictness,
          allowLocalSources: true,
          allowSupplementarySources: false,
        },
      });

      await applyCountryDefaultSourcePreferences(tx, userId, defaults.defaultClinicalCountry);
    });

    return NextResponse.json({
      ok: true,
      completed: true,
      redirectPath: STARTER_TARGETS[starterTarget] ?? STARTER_TARGETS.home,
      settings: {
        practiceCountry,
        usePracticeCountryDefaults,
        uiLanguage,
      },
    });
  } catch (error) {
    console.error("Onboarding save failed:", error);
    return NextResponse.json({ error: "Onboarding save failed" }, { status: 500 });
  }
}
