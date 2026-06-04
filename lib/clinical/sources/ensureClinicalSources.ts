import { prisma } from '../../prisma';
import { CLINICAL_SOURCE_SEEDS } from './sourceRegistry';

export async function ensureClinicalSourceSeeds() {
  for (const source of CLINICAL_SOURCE_SEEDS) {
    const existing = await prisma.clinicalSource.findUnique({
      where: { id: source.id },
      select: { id: true },
    });

    if (existing) continue;

    await prisma.clinicalSource.create({
      data: {
        id: source.id,
        country: source.country,
        name: source.name,
        description: source.description ?? null,
        sourceType: source.sourceType,
        trustLevel: source.trustLevel,
        priority: source.priority,
        baseUrl: source.baseUrl ?? null,
        allowedDomains: source.allowedDomains,
        language: source.language,
        isEnabled: true,
        isOfficial: source.isOfficial,
        specialty: source.specialty ?? null,
      },
    });
  }
}
