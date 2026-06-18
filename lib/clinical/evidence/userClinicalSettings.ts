import { prisma } from '../../prisma';
import { getClinicalCountryConfig, normalizeClinicalCountry, normalizeClinicalOutputLanguage, normalizeEvidenceStrictness, type ClinicalCountryCode } from '../countries/countryRegistry';
import { DEFAULT_PRACTICE_COUNTRY, normalizePracticeCountry, type PracticeCountryCode } from '../practice/practiceCountryRegistry';
import { CLINICAL_SOURCE_SEEDS, getDefaultClinicalSources } from '../sources/sourceRegistry';

export type UserClinicalEvidenceSource = {
  id: string;
  country: ClinicalCountryCode;
  name: string;
  sourceType: string;
  trustLevel: string;
  priority: number;
  isOfficial: boolean;
  baseUrl?: string;
  allowedDomains: string[];
  language: string[];
};

export type UserClinicalEvidenceConfig = {
  practiceCountry: PracticeCountryCode;
  usePracticeCountryDefaults: boolean;
  clinicalCountry: ClinicalCountryCode;
  clinicalOutputLanguage: string;
  evidenceStrictness: 'strict' | 'balanced' | 'local-aware';
  allowLocalSources: boolean;
  allowSupplementarySources: boolean;
  allowedSources: UserClinicalEvidenceSource[];
  hasOfficialSources: boolean;
};

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function seedToEvidenceSource(source: (typeof CLINICAL_SOURCE_SEEDS)[number]): UserClinicalEvidenceSource {
  return {
    id: source.id,
    country: source.country,
    name: source.name,
    sourceType: source.sourceType,
    trustLevel: source.trustLevel,
    priority: source.priority,
    isOfficial: source.isOfficial,
    baseUrl: source.baseUrl,
    allowedDomains: source.allowedDomains,
    language: source.language,
  };
}

export async function getUserClinicalEvidenceConfig(userId: number): Promise<UserClinicalEvidenceConfig> {
  let practiceCountry: PracticeCountryCode = DEFAULT_PRACTICE_COUNTRY;
  let usePracticeCountryDefaults = true;
  let clinicalCountry: ClinicalCountryCode = 'FI';
  let clinicalOutputLanguage = 'fi';
  let evidenceStrictness: 'strict' | 'balanced' | 'local-aware' = 'strict';
  let allowLocalSources = true;
  let allowSupplementarySources = false;

  try {
    const rows = await prisma.$queryRaw<Array<{
      practiceCountry: string;
      usePracticeCountryDefaults: boolean;
      clinicalCountry: string;
      clinicalOutputLanguage: string;
      evidenceStrictness: string;
      allowLocalSources: boolean;
      allowSupplementarySources: boolean;
    }>>`
      SELECT "practiceCountry", "usePracticeCountryDefaults", "clinicalCountry", "clinicalOutputLanguage", "evidenceStrictness", "allowLocalSources", "allowSupplementarySources"
      FROM "UserClinicalSettings"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;

    const row = rows[0];
    if (row) {
      practiceCountry = normalizePracticeCountry(row.practiceCountry);
      usePracticeCountryDefaults = row.usePracticeCountryDefaults !== false;
      clinicalCountry = normalizeClinicalCountry(row.clinicalCountry);
      clinicalOutputLanguage = normalizeClinicalOutputLanguage(clinicalCountry, row.clinicalOutputLanguage);
      evidenceStrictness = normalizeEvidenceStrictness(row.evidenceStrictness);
      allowLocalSources = row.allowLocalSources !== false;
      allowSupplementarySources = row.allowSupplementarySources === true;
    }
  } catch (error) {
    // The settings table may not exist before the migration is deployed. Default safely to FI.
    const country = getClinicalCountryConfig('FI');
    clinicalCountry = country.code;
    clinicalOutputLanguage = country.defaultClinicalOutputLanguage;
    evidenceStrictness = country.defaultEvidenceStrictness;
  }

  let allowedSources: UserClinicalEvidenceSource[] = getDefaultClinicalSources(clinicalCountry).map(seedToEvidenceSource);

  try {
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      country: string;
      name: string;
      sourceType: string;
      trustLevel: string;
      priority: number;
      baseUrl: string | null;
      allowedDomains: unknown;
      language: unknown;
      isOfficial: boolean;
      isEnabled: boolean;
      userEnabled: boolean | null;
    }>>`
      SELECT
        s."id", s."country", s."name", s."sourceType", s."trustLevel", s."priority", s."baseUrl", s."allowedDomains", s."language", s."isOfficial", s."isEnabled",
        p."isEnabled" AS "userEnabled"
      FROM "ClinicalSource" s
      LEFT JOIN "UserClinicalSourcePreference" p ON p."sourceId" = s."id" AND p."userId" = ${userId}
      WHERE s."country" = ${clinicalCountry} AND s."isEnabled" = true
      ORDER BY COALESCE(p."priorityOverride", s."priority") ASC, s."name" ASC
    `;

    const mapped: UserClinicalEvidenceSource[] = rows
      .filter((row) => row.userEnabled !== false)
      .filter((row) => allowLocalSources || (row.trustLevel !== 'local_instruction' && row.sourceType !== 'local_instruction' && row.sourceType !== 'hospital_instruction'))
      .filter((row) => allowSupplementarySources || row.trustLevel !== 'supplementary')
      .map((row) => ({
        id: row.id,
        country: normalizeClinicalCountry(row.country),
        name: row.name,
        sourceType: row.sourceType,
        trustLevel: row.trustLevel,
        priority: row.priority,
        isOfficial: row.isOfficial === true,
        baseUrl: row.baseUrl ?? undefined,
        allowedDomains: parseJsonArray(row.allowedDomains),
        language: parseJsonArray(row.language),
      }));

    if (mapped.length > 0) allowedSources = mapped;
  } catch (error) {
    // Fall back to seeded in-code sources until DB-backed source registry is deployed.
    allowedSources = CLINICAL_SOURCE_SEEDS
      .filter((source) => source.country === clinicalCountry && source.isOfficial)
      .filter((source) => allowLocalSources || (source.trustLevel !== 'local_instruction' && source.sourceType !== 'local_instruction' && source.sourceType !== 'hospital_instruction'))
      .filter((source) => allowSupplementarySources || source.trustLevel !== 'supplementary')
      .map(seedToEvidenceSource);
  }

  return {
    practiceCountry,
    usePracticeCountryDefaults,
    clinicalCountry,
    clinicalOutputLanguage,
    evidenceStrictness,
    allowLocalSources,
    allowSupplementarySources,
    allowedSources,
    hasOfficialSources: allowedSources.some((source) => source.isOfficial && source.trustLevel !== 'not_for_clinical_recommendations'),
  };
}
