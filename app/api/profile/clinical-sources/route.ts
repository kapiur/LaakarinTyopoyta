import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../../lib/admin-auth';
import { prisma } from '../../../../lib/prisma';
import { normalizeClinicalCountry } from '../../../../lib/clinical/countries/countryRegistry';
import { ensureClinicalSourceSeeds } from '../../../../lib/clinical/sources/ensureClinicalSources';
import { getUserClinicalEvidenceConfig } from '../../../../lib/clinical/evidence/userClinicalSettings';

export async function GET(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);
  if (!Number.isFinite(userId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureClinicalSourceSeeds();
  const config = await getUserClinicalEvidenceConfig(userId);
  const url = new URL(req.url);
  const clinicalCountry = normalizeClinicalCountry(url.searchParams.get('country') ?? config.clinicalCountry);

  const sources = await prisma.clinicalSource.findMany({
    where: {
      country: clinicalCountry,
      isEnabled: true,
    },
    orderBy: [{ priority: 'asc' }, { name: 'asc' }],
  });

  const preferences = await prisma.userClinicalSourcePreference.findMany({
    where: {
      userId,
      country: clinicalCountry,
    },
  });

  const preferenceBySource = new Map(preferences.map((preference) => [preference.sourceId, preference]));

  return NextResponse.json({
    clinicalCountry,
    sources: sources.map((source) => {
      const preference = preferenceBySource.get(source.id);
      return {
        id: source.id,
        country: source.country,
        name: source.name,
        description: source.description,
        sourceType: source.sourceType,
        trustLevel: source.trustLevel,
        priority: source.priority,
        baseUrl: source.baseUrl,
        allowedDomains: source.allowedDomains,
        language: source.language,
        isOfficial: source.isOfficial,
        isEnabled: preference?.isEnabled ?? true,
        useForAgent: preference?.useForAgent ?? true,
        useForPikaohjeet: preference?.useForPikaohjeet ?? true,
        useForPatientInstructions: preference?.useForPatientInstructions ?? true,
      };
    }),
  });
}

export async function PUT(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);
  if (!Number.isFinite(userId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureClinicalSourceSeeds();
    const body = await req.json();
    const sourceId = typeof body?.sourceId === 'string' ? body.sourceId : '';
    if (!sourceId) return NextResponse.json({ error: 'Missing sourceId' }, { status: 400 });

    const source = await prisma.clinicalSource.findUnique({ where: { id: sourceId } });
    if (!source || !source.isEnabled) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

    const isEnabled = body?.isEnabled !== false;
    const useForAgent = body?.useForAgent !== false;
    const useForPikaohjeet = body?.useForPikaohjeet !== false;
    const useForPatientInstructions = body?.useForPatientInstructions !== false;

    await prisma.userClinicalSourcePreference.upsert({
      where: {
        userId_sourceId: {
          userId,
          sourceId,
        },
      },
      update: {
        country: source.country,
        isEnabled,
        useForAgent,
        useForPikaohjeet,
        useForPatientInstructions,
      },
      create: {
        userId,
        sourceId,
        country: source.country,
        isEnabled,
        useForAgent,
        useForPikaohjeet,
        useForPatientInstructions,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Clinical source preference save failed:', error);
    return NextResponse.json({ error: 'Clinical source preference save failed' }, { status: 500 });
  }
}
