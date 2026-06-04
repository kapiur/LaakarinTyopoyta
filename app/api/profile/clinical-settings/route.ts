import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../../lib/admin-auth';
import { prisma } from '../../../../lib/prisma';
import { CLINICAL_COUNTRIES, getClinicalCountryConfig, normalizeClinicalCountry, normalizeClinicalOutputLanguage, normalizeEvidenceStrictness } from '../../../../lib/clinical/countries/countryRegistry';
import { getUserClinicalEvidenceConfig } from '../../../../lib/clinical/evidence/userClinicalSettings';
import { ensureClinicalSourceSeeds } from '../../../../lib/clinical/sources/ensureClinicalSources';

export async function GET() {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);
  if (!Number.isFinite(userId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureClinicalSourceSeeds();
  const config = await getUserClinicalEvidenceConfig(userId);

  return NextResponse.json({
    settings: {
      clinicalCountry: config.clinicalCountry,
      clinicalOutputLanguage: config.clinicalOutputLanguage,
      evidenceStrictness: config.evidenceStrictness,
      allowLocalSources: config.allowLocalSources,
      allowSupplementarySources: config.allowSupplementarySources,
    },
    countries: CLINICAL_COUNTRIES,
  });
}

export async function PUT(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);
  if (!Number.isFinite(userId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const clinicalCountry = normalizeClinicalCountry(body?.clinicalCountry);
    const countryConfig = getClinicalCountryConfig(clinicalCountry);
    const clinicalOutputLanguage = normalizeClinicalOutputLanguage(clinicalCountry, body?.clinicalOutputLanguage ?? countryConfig.defaultClinicalOutputLanguage);
    const evidenceStrictness = normalizeEvidenceStrictness(body?.evidenceStrictness ?? countryConfig.defaultEvidenceStrictness);
    const allowLocalSources = body?.allowLocalSources !== false;
    const allowSupplementarySources = body?.allowSupplementarySources === true;

    await prisma.userClinicalSettings.upsert({
      where: { userId },
      update: {
        clinicalCountry,
        clinicalOutputLanguage,
        evidenceStrictness,
        allowLocalSources,
        allowSupplementarySources,
      },
      create: {
        userId,
        clinicalCountry,
        clinicalOutputLanguage,
        evidenceStrictness,
        allowLocalSources,
        allowSupplementarySources,
      },
    });

    await ensureClinicalSourceSeeds();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Clinical settings save failed:', error);
    return NextResponse.json({ error: 'Clinical settings save failed' }, { status: 500 });
  }
}
