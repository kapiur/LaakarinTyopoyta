import { prisma } from '../../prisma';
import { CLINICAL_SOURCE_SEEDS } from './sourceRegistry';

export async function ensureClinicalSourceSeeds() {
  for (const source of CLINICAL_SOURCE_SEEDS) {
    await prisma.clinicalSource.upsert({
      where: { id: source.id },
      update: {
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
      create: {
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
