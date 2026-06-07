import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { normalizeUiLanguage } from '../../../../lib/i18n/config';
import { getPracticeCountryDefaults, normalizePracticeCountry, PRACTICE_COUNTRIES } from '../../../../lib/clinical/practice/practiceCountryRegistry';
import { normalizeClinicalCountry, normalizeClinicalOutputLanguage, normalizeEvidenceStrictness } from '../../../../lib/clinical/countries/countryRegistry';

function getUserId(session: unknown) {
  const userId = Number((session as any)?.user?.id);
  return Number.isFinite(userId) ? userId : null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      uiLanguage: true,
      clinicalSettings: {
        select: {
          practiceCountry: true,
          usePracticeCountryDefaults: true,
          clinicalCountry: true,
          clinicalOutputLanguage: true,
          evidenceStrictness: true,
        },
      },
    },
  });

  const practiceCountry = normalizePracticeCountry(user?.clinicalSettings?.practiceCountry);
  const defaults = getPracticeCountryDefaults(practiceCountry);
  const clinicalCountry = normalizeClinicalCountry(user?.clinicalSettings?.clinicalCountry ?? defaults.defaultClinicalCountry);
  const clinicalOutputLanguage = normalizeClinicalOutputLanguage(clinicalCountry, user?.clinicalSettings?.clinicalOutputLanguage ?? defaults.defaultClinicalOutputLanguage);
  const evidenceStrictness = normalizeEvidenceStrictness(user?.clinicalSettings?.evidenceStrictness ?? defaults.defaultEvidenceStrictness);

  return NextResponse.json({
    settings: {
      practiceCountry,
      usePracticeCountryDefaults: user?.clinicalSettings?.usePracticeCountryDefaults ?? true,
      uiLanguage: normalizeUiLanguage(user?.uiLanguage ?? defaults.defaultUiLanguage),
      clinicalCountry,
      clinicalOutputLanguage,
      evidenceStrictness,
    },
    countries: PRACTICE_COUNTRIES,
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const practiceCountry = normalizePracticeCountry(body?.practiceCountry);
    const usePracticeCountryDefaults = body?.usePracticeCountryDefaults !== false;
    const defaults = getPracticeCountryDefaults(practiceCountry);

    await prisma.$transaction(async (tx) => {
      await tx.userClinicalSettings.upsert({
        where: { userId },
        update: usePracticeCountryDefaults
          ? {
              practiceCountry,
              usePracticeCountryDefaults: true,
              clinicalCountry: defaults.defaultClinicalCountry,
              clinicalOutputLanguage: defaults.defaultClinicalOutputLanguage,
              evidenceStrictness: defaults.defaultEvidenceStrictness,
            }
          : {
              practiceCountry,
              usePracticeCountryDefaults: false,
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

      if (usePracticeCountryDefaults) {
        await tx.user.update({
          where: { id: userId },
          data: { uiLanguage: defaults.defaultUiLanguage },
        });
      }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        uiLanguage: true,
        clinicalSettings: {
          select: {
            practiceCountry: true,
            usePracticeCountryDefaults: true,
            clinicalCountry: true,
            clinicalOutputLanguage: true,
            evidenceStrictness: true,
          },
        },
      },
    });

    const savedPracticeCountry = normalizePracticeCountry(user?.clinicalSettings?.practiceCountry ?? practiceCountry);
    const savedDefaults = getPracticeCountryDefaults(savedPracticeCountry);
    const savedClinicalCountry = normalizeClinicalCountry(user?.clinicalSettings?.clinicalCountry ?? savedDefaults.defaultClinicalCountry);
    const savedClinicalOutputLanguage = normalizeClinicalOutputLanguage(
      savedClinicalCountry,
      user?.clinicalSettings?.clinicalOutputLanguage ?? savedDefaults.defaultClinicalOutputLanguage
    );
    const savedEvidenceStrictness = normalizeEvidenceStrictness(
      user?.clinicalSettings?.evidenceStrictness ?? savedDefaults.defaultEvidenceStrictness
    );

    return NextResponse.json({
      ok: true,
      settings: {
        practiceCountry: savedPracticeCountry,
        usePracticeCountryDefaults: user?.clinicalSettings?.usePracticeCountryDefaults ?? usePracticeCountryDefaults,
        uiLanguage: normalizeUiLanguage(user?.uiLanguage ?? savedDefaults.defaultUiLanguage),
        clinicalCountry: savedClinicalCountry,
        clinicalOutputLanguage: savedClinicalOutputLanguage,
        evidenceStrictness: savedEvidenceStrictness,
      },
    });
  } catch (error) {
    console.error('Workspace context save failed:', error);
    return NextResponse.json({ error: 'Workspace context save failed' }, { status: 500 });
  }
}
