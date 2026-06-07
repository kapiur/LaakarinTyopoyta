import type { Prisma, PrismaClient } from '@prisma/client';
import { getClinicalCountryConfig, type ClinicalCountryCode } from '../countries/countryRegistry';

type SourcePreferenceClient = PrismaClient | Prisma.TransactionClient;

export async function applyCountryDefaultSourcePreferences(
  client: SourcePreferenceClient,
  userId: number,
  country: ClinicalCountryCode
) {
  const countryConfig = getClinicalCountryConfig(country);
  const sources = await client.clinicalSource.findMany({
    where: {
      country,
      isEnabled: true,
    },
    select: {
      id: true,
    },
  });

  for (const source of sources) {
    const isDefaultSource = countryConfig.defaultSourceIds.includes(source.id);

    await client.userClinicalSourcePreference.upsert({
      where: {
        userId_sourceId: {
          userId,
          sourceId: source.id,
        },
      },
      update: {
        country,
        isEnabled: isDefaultSource,
        useForAgent: isDefaultSource,
        useForPikaohjeet: isDefaultSource,
        useForPatientInstructions: isDefaultSource,
      },
      create: {
        userId,
        sourceId: source.id,
        country,
        isEnabled: isDefaultSource,
        useForAgent: isDefaultSource,
        useForPikaohjeet: isDefaultSource,
        useForPatientInstructions: isDefaultSource,
      },
    });
  }
}
