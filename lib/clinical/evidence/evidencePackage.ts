import type { AiTaskType } from '../../ai/taskTypes';
import type { RetrievedEvidence } from './retrieveClinicalEvidence';
import type { UserClinicalEvidenceConfig } from './userClinicalSettings';

export type EvidenceStatus = 'found' | 'partial' | 'not_found' | 'not_required';
export type EvidenceLevel = 'official_guideline' | 'official_reference' | 'local_instruction' | 'insufficient_evidence' | 'not_clinical';

export type EvidencePackage = {
  status: EvidenceStatus;
  level: EvidenceLevel;
  clinicalCountry: string;
  clinicalOutputLanguage: string;
  evidenceStrictness: string;
  requiresEvidence: boolean;
  sources: Array<{
    id: string;
    name: string;
    sourceType: string;
    trustLevel: string;
    baseUrl?: string;
  }>;
  excerpts: Array<{
    sourceId: string;
    title?: string;
    url?: string;
    text: string;
    retrievedAt: string;
  }>;
  warnings: string[];
  unsupportedClaims: string[];
};

function sourceLevel(trustLevel: string): EvidenceLevel {
  if (trustLevel === 'primary_guideline') return 'official_guideline';
  if (trustLevel === 'official_reference' || trustLevel === 'authority_instruction') return 'official_reference';
  if (trustLevel === 'local_instruction') return 'local_instruction';
  return 'insufficient_evidence';
}

export function buildInitialEvidencePackage(input: {
  taskType: AiTaskType;
  requiresEvidence: boolean;
  config: UserClinicalEvidenceConfig;
}): EvidencePackage {
  const sources = input.config.allowedSources.map((source) => ({
    id: source.id,
    name: source.name,
    sourceType: source.sourceType,
    trustLevel: source.trustLevel,
    baseUrl: source.baseUrl,
  }));

  if (!input.requiresEvidence) {
    return {
      status: 'not_required',
      level: 'not_clinical',
      clinicalCountry: input.config.clinicalCountry,
      clinicalOutputLanguage: input.config.clinicalOutputLanguage,
      evidenceStrictness: input.config.evidenceStrictness,
      requiresEvidence: false,
      sources,
      excerpts: [],
      warnings: [],
      unsupportedClaims: [],
    };
  }

  if (!input.config.hasOfficialSources) {
    return {
      status: 'not_found',
      level: 'insufficient_evidence',
      clinicalCountry: input.config.clinicalCountry,
      clinicalOutputLanguage: input.config.clinicalOutputLanguage,
      evidenceStrictness: input.config.evidenceStrictness,
      requiresEvidence: true,
      sources,
      excerpts: [],
      warnings: ['No enabled official clinical sources are available for the selected country.'],
      unsupportedClaims: [],
    };
  }

  const highestLevel = sources
    .map((source) => sourceLevel(source.trustLevel))
    .find((level) => level === 'official_guideline' || level === 'official_reference') ?? 'insufficient_evidence';

  return {
    status: 'partial',
    level: highestLevel,
    clinicalCountry: input.config.clinicalCountry,
    clinicalOutputLanguage: input.config.clinicalOutputLanguage,
    evidenceStrictness: input.config.evidenceStrictness,
    requiresEvidence: true,
    sources,
    excerpts: [],
    warnings: [
      'Official source registry is available, but this MVP does not yet retrieve guideline passages. Do not provide concrete clinical recommendations unless the user provides source text or a later retrieval layer supplies evidence facts.',
    ],
    unsupportedClaims: [],
  };
}

export function buildEvidencePackageFromRetrieved(input: {
  taskType: AiTaskType;
  requiresEvidence: boolean;
  config: UserClinicalEvidenceConfig;
  retrieved: RetrievedEvidence;
}): EvidencePackage {
  const fallback = buildInitialEvidencePackage({
    taskType: input.taskType,
    requiresEvidence: input.requiresEvidence,
    config: input.config,
  });

  if (!input.requiresEvidence) {
    return {
      ...fallback,
      status: 'not_required',
      sources: input.retrieved.sources.length > 0 ? input.retrieved.sources : fallback.sources,
      excerpts: input.retrieved.excerpts,
      warnings: input.retrieved.warnings,
    };
  }

  const sourceLevels = input.retrieved.sources.map((source) => sourceLevel(source.trustLevel));
  const highestLevel = sourceLevels.find((level) => level === 'official_guideline' || level === 'official_reference') ?? fallback.level;

  return {
    ...fallback,
    status: input.retrieved.status,
    level: input.retrieved.excerpts.length > 0 ? highestLevel : fallback.level,
    sources: input.retrieved.sources.length > 0 ? input.retrieved.sources : fallback.sources,
    excerpts: input.retrieved.excerpts,
    warnings: input.retrieved.warnings.length > 0 ? input.retrieved.warnings : fallback.warnings,
  };
}

export function buildNoEvidenceReply(input: { clinicalCountry: string; language: string; sources: EvidencePackage['sources'] }) {
  if (input.language === 'ru') {
    return [
      'Я не нашёл достаточного подтверждения в официальных клинических источниках выбранной страны для безопасной рекомендации.',
      '',
      `Страна рекомендаций: ${input.clinicalCountry}.`,
      input.sources.length > 0 ? `Доступные источники: ${input.sources.map((source) => source.name).join(', ')}.` : 'Включённые официальные источники отсутствуют.',
      '',
      'Я могу помочь только с оформлением уже предоставленных пользователем данных, но не буду добавлять новые клинические рекомендации, дозировки, критерии направления, red flags или схемы лечения без подтверждённого источника.',
    ].join('\n');
  }

  if (input.language === 'fi') {
    return [
      'En löytänyt riittävää tukea valitun maan virallisista kliinisistä lähteistä turvallista suositusta varten.',
      '',
      `Kliininen maa: ${input.clinicalCountry}.`,
      input.sources.length > 0 ? `Käytettävissä olevat lähteet: ${input.sources.map((source) => source.name).join(', ')}.` : 'Käytössä olevia virallisia lähteitä ei ole.',
      '',
      'Voin auttaa vain käyttäjän antamien tietojen muotoilussa, mutta en lisää uusia kliinisiä suosituksia, annoksia, lähetekriteerejä, red flags -kohtia tai hoito-ohjeita ilman vahvistettua lähdettä.',
    ].join('\n');
  }

  return [
    'I did not find sufficient support in the selected country\'s official clinical sources to provide a safe recommendation.',
    '',
    `Clinical country: ${input.clinicalCountry}.`,
    input.sources.length > 0 ? `Available sources: ${input.sources.map((source) => source.name).join(', ')}.` : 'No enabled official sources are available.',
    '',
    'I can help format information provided by the user, but I will not add new clinical recommendations, dosages, referral criteria, red flags or treatment instructions without confirmed source support.',
  ].join('\n');
}
