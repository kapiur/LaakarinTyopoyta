import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/admin-auth';
import { sanitizeAgentInputs, type AgentPrivacyInputKind } from '../../../lib/ai/agent/agentPrivacy';
import { createAgentPlan } from '../../../lib/ai/agent/agentPlanner';
import { logAiRunAudit } from '../../../lib/ai/audit/logAiRunAudit';
import type { AgentContextType, AgentRequestBody, AgentUiLanguage } from '../../../lib/ai/agent/types';
import { runRoutedAiCompletion } from '../../../lib/ai/runRoutedAiCompletion';
import { preparePrivacyPayload } from '../../../lib/privacy/gateway';
import type { PrivacyGatewayMode } from '../../../lib/privacy/gateway';
import { hasCriticalPrivacyFindingTypes } from '../../../lib/privacy/gateway/decision';
import type { AiTaskType } from '../../../lib/ai/taskTypes';
import { taskAllowsRegistryOnlyReference, taskRequiresEvidence } from '../../../lib/ai/taskTypes';
import { normalizeUiLanguage as normalizeSharedUiLanguage } from '../../../lib/i18n/config';
import {
  buildEvidencePackageFromRetrieved,
  buildNoEvidenceReply,
  type EvidencePackage,
} from '../../../lib/clinical/evidence/evidencePackage';
import { checkEvidenceConsistency } from '../../../lib/clinical/evidence/checkEvidenceConsistency';
import { retrieveClinicalEvidence, type RetrievedEvidence } from '../../../lib/clinical/evidence/retrieveClinicalEvidence';
import {
  getUserClinicalEvidenceConfig,
  type UserClinicalEvidenceConfig,
} from '../../../lib/clinical/evidence/userClinicalSettings';
import {
  CLINICAL_COUNTRIES,
  getClinicalCountryConfig,
  normalizeClinicalCountry,
  type ClinicalCountryCode,
} from '../../../lib/clinical/countries/countryRegistry';
import {
  buildWorkspaceContextInstruction,
  getUserAiWorkspaceContext,
  languageLabel,
  resolveResponseLanguage,
} from '../../../lib/ai/workspaceContext';
import { profileModeForTask } from '../../../lib/ai/aiRouter';
import { buildUserAiProfileInstruction } from '../../../lib/ai/userAiProfile';
import { getUserAiProfile } from '../../../lib/ai/userAiProfileStore';
import { getUserAiSettings } from '../../../lib/ai/userAiSettings';

function normalizeContextType(value: unknown): AgentContextType {
  if (
    value === 'general' ||
    value === 'clinicalReference' ||
    value === 'clinicalResearch' ||
    value === 'malli' ||
    value === 'aiTool' ||
    value === 'clinicalText' ||
    value === 'pikaohje'
  ) {
    return value;
  }

  return 'general';
}

function normalizeUiLanguage(value: unknown): AgentUiLanguage {
  return normalizeSharedUiLanguage(value);
}

function optionalString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

type RequestedResearchCountry = {
  code: string;
  supportedCode?: ClinicalCountryCode;
  label: string;
};

type ResearchCountryResolution = {
  requested: RequestedResearchCountry[];
  supported: ClinicalCountryCode[];
  unsupported: string[];
};

const RESEARCH_COUNTRY_ALIAS_MAP: Array<{
  code: string;
  aliases: string[];
  supportedCode?: ClinicalCountryCode;
}> = [
  {
    code: 'FI',
    supportedCode: 'FI',
    aliases: ['fi', 'finland', 'suomi', 'финляндия'],
  },
  {
    code: 'RU',
    supportedCode: 'RU',
    aliases: ['ru', 'russia', 'rossiya', 'россия', 'россий', 'venäjä', 'venaja'],
  },
  {
    code: 'DE',
    supportedCode: 'DE',
    aliases: ['de', 'germany', 'deutschland', 'saksa', 'германия'],
  },
  {
    code: 'US',
    aliases: ['us', 'usa', 'u.s.', 'u.s.a.', 'united states', 'america', 'америка', 'сша', 'соединенные штаты', 'соединённые штаты'],
  },
  {
    code: 'EU',
    aliases: ['eu', 'europe', 'european union', 'европа', 'евросоюз', 'европейский союз'],
  },
];

function normalizeCountrySearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}"'`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countryAliasMatched(haystack: string, alias: string) {
  const normalizedAlias = normalizeCountrySearchText(alias);
  if (!normalizedAlias) return false;

  const pattern = new RegExp(`(^|\\s)${escapeRegex(normalizedAlias)}(?=\\s|$)`, 'i');
  return pattern.test(haystack);
}

function normalizeResearchCountryCode(value: unknown): ClinicalCountryCode | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'FI' || normalized === 'RU' || normalized === 'DE') {
    return normalizeClinicalCountry(normalized);
  }
  return null;
}

function titleCaseCountryCode(code: string) {
  return code.toUpperCase();
}

function uniqueCountryCodes(values: ClinicalCountryCode[]) {
  return Array.from(new Set(values));
}

function resolveResearchCountries(input: {
  selectedCountries?: unknown;
  userMessage: string;
  currentText: string;
  currentTemplate: string;
  fallbackCountry: ClinicalCountryCode;
}) : ResearchCountryResolution {
  const requested: RequestedResearchCountry[] = [];
  const requestedCodes = new Set<string>();

  const pushRequested = (code: string, supportedCode?: ClinicalCountryCode) => {
    const normalizedCode = titleCaseCountryCode(code);
    if (requestedCodes.has(normalizedCode)) return;
    requestedCodes.add(normalizedCode);
    requested.push({
      code: normalizedCode,
      supportedCode,
      label: normalizedCode,
    });
  };

  if (Array.isArray(input.selectedCountries)) {
    for (const item of input.selectedCountries) {
      const supportedCode = normalizeResearchCountryCode(item);
      if (supportedCode) {
        pushRequested(supportedCode, supportedCode);
      }
    }
  }

  const haystack = normalizeCountrySearchText([
    input.userMessage,
    input.currentText,
    input.currentTemplate,
  ].filter(Boolean).join(' '));

  for (const candidate of RESEARCH_COUNTRY_ALIAS_MAP) {
    const matched = candidate.aliases.some((alias) => countryAliasMatched(haystack, alias));
    if (matched) {
      pushRequested(candidate.code, candidate.supportedCode);
    }
  }

  const supported = uniqueCountryCodes(
    requested
      .map((item) => item.supportedCode)
      .filter((item): item is ClinicalCountryCode => Boolean(item))
  );

  if (requested.length === 0) {
    return {
      requested: [{
        code: input.fallbackCountry,
        supportedCode: input.fallbackCountry,
        label: input.fallbackCountry,
      }],
      supported: [input.fallbackCountry],
      unsupported: [],
    };
  }

  return {
    requested,
    supported,
    unsupported: requested
      .filter((item) => !item.supportedCode)
      .map((item) => item.label),
  };
}

function supportedResearchCountryLabels(countries: ClinicalCountryCode[]) {
  return countries.map((country) => {
    const config = getClinicalCountryConfig(country);
    return `${country} (${config.name.en ?? country})`;
  });
}

function localizeUnsupportedResearchCountriesWarning(language: AgentUiLanguage, countries: string[]) {
  const labels = countries.join(', ');

  if (language === 'ru') {
    return `Запрошенные страны пока не подключены к официальному research-режиму агента: ${labels}. Сейчас доступны только ${supportedResearchCountryLabels(CLINICAL_COUNTRIES.map((country) => country.code)).join(', ')}.`;
  }

  if (language === 'fi') {
    return `Pyydettyjä maita ei ole vielä liitetty agentin viralliseen tutkimustilaan: ${labels}. Tällä hetkellä käytettävissä ovat vain ${supportedResearchCountryLabels(CLINICAL_COUNTRIES.map((country) => country.code)).join(', ')}.`;
  }

  if (language === 'de') {
    return `Die angefragten Länder sind im offiziellen Recherchemodus des Agenten noch nicht angebunden: ${labels}. Aktuell verfügbar sind nur ${supportedResearchCountryLabels(CLINICAL_COUNTRIES.map((country) => country.code)).join(', ')}.`;
  }

  return `The requested countries are not yet connected in the agent's official research mode: ${labels}. Currently available countries are only ${supportedResearchCountryLabels(CLINICAL_COUNTRIES.map((country) => country.code)).join(', ')}.`;
}

function localizeNoSupportedResearchCountryReply(language: AgentUiLanguage, countries: string[]) {
  const warning = localizeUnsupportedResearchCountriesWarning(language, countries);

  if (language === 'ru') {
    return [
      warning,
      '',
      'Для содержательного сравнения нужны подключённые официальные источники по каждой выбранной стране.',
    ].join('\n');
  }

  if (language === 'fi') {
    return [
      warning,
      '',
      'Sisällöllinen vertailu edellyttää, että jokaiselle valitulle maalle on liitetty viralliset lähteet.',
    ].join('\n');
  }

  if (language === 'de') {
    return [
      warning,
      '',
      'Für einen inhaltlichen Vergleich müssen für jedes gewählte Land offizielle Quellen angebunden sein.',
    ].join('\n');
  }

  return [
    warning,
    '',
    'A meaningful comparison requires connected official sources for each requested country.',
  ].join('\n');
}

function buildResearchModeInstruction(input: {
  language: AgentUiLanguage;
  supportedCountries: ClinicalCountryCode[];
  unsupportedCountries: string[];
  taskType: AiTaskType;
}) {
  const supportedCountries = supportedResearchCountryLabels(input.supportedCountries).join(', ');
  const unsupportedCountries = input.unsupportedCountries.join(', ');

  return [
    'Research comparison mode:',
    `The clinician explicitly wants cross-country research or guideline study for: ${supportedCountries || 'no connected countries resolved'}.`,
    unsupportedCountries ? `Requested but unsupported countries: ${unsupportedCountries}. State clearly that they are not connected yet and do not infer their recommendations.` : '',
    'Do not silently fall back to the workspace clinical country when the user asked about other countries.',
    'Compare only countries that are explicitly requested or selected for this research mode.',
    'If only one connected country is available, do not pretend a comparison exists; provide only a cautious source-backed note for that one country and say what is missing for the rest.',
    'If exact excerpts exist, compare only the supported points from those excerpts.',
    'If only registry-level source availability exists, keep the answer at checklist level and do not invent exact differences.',
    input.taskType === 'clinical_guideline_comparison'
      ? 'The output should be framed as a comparison between official sources, not as patient care advice.'
      : 'The output should be framed as a clinician research note, not as patient care advice.',
  ].filter(Boolean).join('\n');
}

function mergeResearchEvidence(input: {
  language: AgentUiLanguage;
  taskType: AiTaskType;
  countryEvidence: Array<{
    country: ClinicalCountryCode;
    config: UserClinicalEvidenceConfig;
    evidence: EvidencePackage;
  }>;
  unsupportedCountries: string[];
}) : EvidencePackage {
  const sources = new Map<string, EvidencePackage['sources'][number]>();
  const excerpts: EvidencePackage['excerpts'] = [];
  const warnings: string[] = [];
  let level: EvidencePackage['level'] = 'insufficient_evidence';
  let requiresEvidence = false;
  let foundCount = 0;
  let partialCount = 0;
  let notRequiredCount = 0;

  for (const item of input.countryEvidence) {
    requiresEvidence = requiresEvidence || item.evidence.requiresEvidence;

    if (item.evidence.status === 'found') {
      foundCount += 1;
    } else if (item.evidence.status === 'partial') {
      partialCount += 1;
    } else if (item.evidence.status === 'not_required') {
      notRequiredCount += 1;
    }

    if (level !== 'official_guideline' && item.evidence.level === 'official_guideline') {
      level = 'official_guideline';
    } else if (
      level !== 'official_guideline' &&
      level !== 'official_reference' &&
      item.evidence.level === 'official_reference'
    ) {
      level = 'official_reference';
    }

    for (const source of item.evidence.sources) {
      sources.set(source.id, source);
    }

    for (const excerpt of item.evidence.excerpts) {
      excerpts.push({
        ...excerpt,
        title: excerpt.title ? `[${item.country}] ${excerpt.title}` : `[${item.country}]`,
      });
    }

    const localizedWarnings = localizeEvidenceWarningList(
      input.language,
      item.evidence.warnings,
      {
        status: item.evidence.status,
        registryOnlyReference: item.evidence.status !== 'found',
      },
    );

    for (const warning of localizedWarnings) {
      warnings.push(`[${item.country}] ${warning}`);
    }
  }

  if (input.unsupportedCountries.length > 0) {
    warnings.unshift(localizeUnsupportedResearchCountriesWarning(input.language, input.unsupportedCountries));
  }

  const supportedCountries = input.countryEvidence.map((item) => item.country);
  const clinicalOutputLanguages = uniqueStrings(
    input.countryEvidence.map((item) => item.config.clinicalOutputLanguage)
  );
  const isComparisonTask = input.taskType === 'clinical_guideline_comparison';
  let status: EvidencePackage['status'] = 'not_found';

  if (isComparisonTask) {
    if (foundCount === input.countryEvidence.length && foundCount > 0) {
      status = 'found';
    } else if (foundCount > 0 || partialCount > 0) {
      status = 'partial';
    } else if (notRequiredCount === input.countryEvidence.length && notRequiredCount > 0) {
      status = 'not_required';
    }
  } else {
    if (foundCount > 0) {
      status = 'found';
    } else if (partialCount > 0) {
      status = 'partial';
    } else if (notRequiredCount === input.countryEvidence.length && notRequiredCount > 0) {
      status = 'not_required';
    }
  }

  return {
    status,
    level,
    clinicalCountry: supportedCountries.join(' + '),
    clinicalOutputLanguage: clinicalOutputLanguages.join(', '),
    evidenceStrictness: input.countryEvidence[0]?.config.evidenceStrictness ?? 'strict',
    requiresEvidence,
    sources: Array.from(sources.values()),
    excerpts,
    warnings: uniqueStrings(warnings),
    unsupportedClaims: [],
  };
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n...[truncated]`;
}

function buildConversationContext(body: AgentRequestBody) {
  const turns = Array.isArray(body.conversationContext?.previousTurns)
    ? body.conversationContext.previousTurns.slice(-4)
    : [];

  if (turns.length === 0 && !body.conversationContext?.latestDraft) return '';

  const safeTurns = turns.map((turn, index) => [
    `Turn ${index + 1}`,
    `User: ${truncate(optionalString(turn.userMessage), 1200)}`,
    `Assistant reply: ${truncate(optionalString(turn.assistantReply), 2000)}`,
    turn.assistantDraft ? `Assistant draft: ${truncate(optionalString(turn.assistantDraft), 2000)}` : '',
  ].filter(Boolean).join('\n'));

  return [
    'Previous transient conversation context follows.',
    'Use it only to refine the current task. Do not treat it as independently verified clinical evidence.',
    'Keep all privacy and evidence rules active for the latest user request.',
    body.conversationContext?.latestDraft
      ? `Latest draft to refine:\n${truncate(optionalString(body.conversationContext.latestDraft), 3000)}`
      : '',
    ...safeTurns,
  ].filter(Boolean).join('\n\n');
}

function inputKindForContext(contextType: AgentContextType) {
  if (contextType === 'clinicalText' || contextType === 'pikaohje') return 'clinicalText' as const;
  if (contextType === 'aiTool') return 'storedInstruction' as const;
  if (contextType === 'malli') return 'general' as const;
  if (contextType === 'clinicalReference') return 'general' as const;
  return 'general' as const;
}

function normalizePrivacyInputKind(value: unknown, fallback: AgentPrivacyInputKind) {
  if (
    value === 'clinicalText' ||
    value === 'profileSample' ||
    value === 'storedInstruction' ||
    value === 'publicSourceText' ||
    value === 'templateSyntax' ||
    value === 'general'
  ) {
    return value;
  }

  return fallback;
}

function normalizeHeadingLine(line: string) {
  return line
    .toLowerCase()
    .replace(/\r/g, '')
    .replace(/\*\*/g, '')
    .replace(/^[-\s]+/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/\s*[:：]\s*$/, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDraftHeading(line: string) {
  const normalized = normalizeHeadingLine(line);
  return [
    'draft',
    'luonnos',
    'ehdotus',
    'proposed solution',
    'korjattu luonnos',
    'malliluonnos',
    'promptiluonnos',
    'черновик/предлагаемое решение',
    'предлагаемое решение',
    'предлагаемый вариант',
  ].some((candidate) => normalized === candidate || normalized.startsWith(candidate));
}

function isNextActionHeading(line: string) {
  const normalized = normalizeHeadingLine(line);
  return [
    'suggested next action',
    'recommended next action',
    'ehdotettu seuraava toiminto',
    'suositeltu seuraava toiminto',
    'рекомендуемое следующее действие',
  ].some((candidate) => normalized === candidate || normalized.startsWith(candidate));
}

function parseDraftFromContent(content: string) {
  const normalizedContent = content.replace(/\r/g, '').trim();
  if (!normalizedContent) return '';

  const lines = normalizedContent.split('\n');
  const draftStartIndex = lines.findIndex((line) => isDraftHeading(line));
  if (draftStartIndex !== -1) {
    const afterDraftLines = lines.slice(draftStartIndex + 1);
    const nextActionIndex = afterDraftLines.findIndex((line) => isNextActionHeading(line));
    const keptLines = nextActionIndex === -1 ? afterDraftLines : afterDraftLines.slice(0, nextActionIndex);

    return keptLines.join('\n').trim();
  }

  const heading1Index = lines.findIndex((line) => /^\s*1[.)]\s+/.test(line));
  const heading2Index = lines.findIndex((line, index) => index > heading1Index && /^\s*2[.)]\s+/.test(line));
  const heading3Index = lines.findIndex((line, index) => index > heading2Index && /^\s*3[.)]\s+/.test(line));
  const heading4Index = lines.findIndex((line, index) => index > heading3Index && /^\s*4[.)]\s+/.test(line));

  if (heading1Index !== -1 && heading2Index !== -1 && heading3Index !== -1) {
    const keptLines = heading4Index === -1 ? lines.slice(heading3Index + 1) : lines.slice(heading3Index + 1, heading4Index);
    const fallbackDraft = keptLines.join('\n').trim();
    if (fallbackDraft) {
      return fallbackDraft;
    }
  }

  return normalizedContent;
}

function normalizeReplyForDisplay(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return trimmed;

  const extractedDraft = parseDraftFromContent(trimmed);
  if (extractedDraft && extractedDraft !== trimmed) {
    return extractedDraft;
  }

  return trimmed;
}

const DISPLAY_PRIVACY_PLACEHOLDERS = [
  '[NAME]',
  '[HETU]',
  '[DATE_OF_BIRTH]',
  '[DATE]',
  '[PHONE]',
  '[EMAIL]',
  '[ADDRESS]',
  '[PATIENT_ID]',
  '[PROFESSIONAL_NAME]',
];

function removeUnexpectedPrivacyPlaceholders(input: {
  content: string;
  sourceText: string;
  taskType: AiTaskType;
  contextType: AgentContextType;
}) {
  const shouldNormalize =
    input.contextType === 'clinicalText' ||
    input.contextType === 'pikaohje' ||
    input.taskType === 'translation' ||
    input.taskType === 'clinical_document' ||
    input.taskType === 'clinical_review' ||
    input.taskType === 'text_fix' ||
    input.taskType === 'lab_format';

  if (!shouldNormalize || !input.content.trim()) return input.content;

  let normalized = input.content;

  if (!input.sourceText.includes('[NAME]')) {
    normalized = normalized.replace(
      /\b(Potilas|Potilaalla|Potilaan|Пациент|Пациента|Пациентка|Пациентки|Patient|Patients?|Patientin|Patienten)\s+\[NAME\]\b/g,
      '$1',
    );
  }

  for (const placeholder of DISPLAY_PRIVACY_PLACEHOLDERS) {
    if (input.sourceText.includes(placeholder)) continue;
    normalized = normalized.split(placeholder).join('');
  }

  return normalized
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;:!?])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/^\s+|\s+$/g, '');
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function localizedEvidenceWarnings(
  language: AgentUiLanguage,
  status: string,
  registryOnlyReference = false,
) {
  if (registryOnlyReference) {
    if (language === 'ru') {
      return [
        'Официальные источники для выбранной страны настроены, но текущая версия агента ещё не извлекает автоматически конкретные фрагменты из этих источников. Поэтому ответ должен оставаться справочным: структура сравнения, общие принципы и указание, какие пункты нужно проверить. Нельзя утверждать конкретные различия, дозировки, целевые значения, сроки лечения, red flags или критерии направления без retrieved evidence или вставленного фрагмента источника.',
      ];
    }

    if (language === 'fi') {
      return [
        'Valitun maan viralliset lähteet on määritelty, mutta tämä agenttiversio ei vielä hae automaattisesti varsinaisia lähdekatkelmia. Vastauksen tulee siksi olla yleinen viite-/vertailurakenne. Tarkkoja eroja, annoksia, tavoitearvoja, hoidon kestoja, red flags -kohtia tai lähetekriteereitä ei saa esittää ilman retrieved evidence -tietoja tai käyttäjän liittämää lähdekatkelmaa.',
      ];
    }

    return [
      'Official sources are configured for the selected country, but this agent version does not yet automatically retrieve specific source excerpts. The answer must remain a general reference/comparison framework. Do not state exact differences, dosages, targets, treatment durations, red flags or referral criteria without retrieved evidence or a user-provided source excerpt.',
    ];
  }

  if (status === 'not_found') {
    if (language === 'ru') return ['Для выбранной страны не включены официальные клинические источники.'];
    if (language === 'fi') return ['Valitulle maalle ei ole käytössä virallisia kliinisiä lähteitä.'];
    return ['No enabled official clinical sources are available for the selected country.'];
  }

  if (status === 'partial') {
    if (language === 'ru') {
      return [
        'Реестр официальных источников доступен, но этот MVP ещё не извлекает конкретные фрагменты клинических рекомендаций. Нельзя давать конкретные клинические рекомендации, если пользователь не предоставил текст источника или retrieval-layer не передал evidence facts.',
      ];
    }

    if (language === 'fi') {
      return [
        'Virallinen lähderekisteri on käytettävissä, mutta tämä MVP ei vielä hae varsinaisia suosituskatkelmia. Konkreettisia kliinisiä suosituksia ei saa antaa, ellei käyttäjä anna lähdetekstiä tai myöhempi retrieval-layer toimita evidence facts -tietoja.',
      ];
    }

    return [
      'Official source registry is available, but this MVP does not yet retrieve guideline passages. Do not provide concrete clinical recommendations unless the user provides source text or a later retrieval layer supplies evidence facts.',
    ];
  }

  return [];
}

function localizeEvidenceWarning(
  language: AgentUiLanguage,
  warning: string,
  options: { status: string; registryOnlyReference: boolean },
) {
  if (warning.startsWith('Official source registry is available')) {
    return localizedEvidenceWarnings(language, options.status, options.registryOnlyReference)[0] ?? warning;
  }

  if (warning.startsWith('No enabled official clinical sources are available')) {
    return localizedEvidenceWarnings(language, 'not_found', false)[0] ?? warning;
  }

  if (warning.startsWith('Could not load cached guideline evidence:')) {
    const details = warning.replace('Could not load cached guideline evidence:', '').trim();
    if (language === 'ru') return `Не удалось загрузить локальный кэш рекомендаций: ${details || 'неизвестная ошибка'}`;
    if (language === 'fi') return `Paikallista suositusvälimuistia ei voitu ladata: ${details || 'tuntematon virhe'}`;
    return `Could not load cached guideline cache: ${details || 'unknown error'}`;
  }

  if (warning.startsWith('Skipped non-allowed source URL:')) {
    if (language === 'ru') return 'Ссылка на источник вне разрешённого списка была пропущена.';
    if (language === 'fi') return 'Lähdeosoite ohitettiin, koska se ei kuulu sallittuihin lähteisiin.';
    return 'A source URL outside the allowed source list was skipped.';
  }

  if (warning.startsWith('Could not retrieve source URL')) {
    if (language === 'ru') return 'Не удалось получить текст по указанной ссылке на источник.';
    if (language === 'fi') return 'Annetusta lähdeosoitteesta ei saatu tekstiä.';
    return 'Could not retrieve text from the provided source URL.';
  }

  return warning;
}

function localizeEvidenceWarningList(
  language: AgentUiLanguage,
  warnings: string[],
  options: { status: string; registryOnlyReference: boolean },
) {
  const mapped = warnings.map((warning) => localizeEvidenceWarning(language, warning, options));
  const fallback = localizedEvidenceWarnings(language, options.status, options.registryOnlyReference);
  const hasGenericRegistryWarning = mapped.some((warning) => warning === fallback[0]);

  return uniqueStrings([
    ...mapped,
    ...(!hasGenericRegistryWarning && fallback.length > 0 ? fallback : []),
  ]);
}

function buildPrivacyBlockReply(language: AgentUiLanguage) {
  if (language === 'ru') {
    return 'В тексте остались идентифицирующие данные после автоматической анонимизации. Агент не отправит такой текст во внешний AI. Удали имя, контакты, идентификаторы, адрес и другие персональные данные и попробуй снова.';
  }

  if (language === 'en') {
    return 'Identifying details remain in the text after automatic anonymisation. The agent will not send this text to an external AI service. Remove names, contact details, identifiers, addresses and other personal data, then try again.';
  }

  if (language === 'de') {
    return 'Nach der automatischen Anonymisierung sind noch identifizierende Angaben im Text vorhanden. Der Agent sendet diesen Text nicht an einen externen AI-Dienst. Entferne Namen, Kontaktdaten, Kennungen, Adressen und andere personenbezogene Daten und versuche es erneut.';
  }

  return 'Tekstiin jäi automaattisen anonymisoinnin jälkeen tunnistetietoja. Agentti ei lähetä tällaista tekstiä ulkoiseen AI-palveluun. Poista nimet, yhteystiedot, tunnisteet, osoitteet ja muut henkilötiedot ja yritä uudelleen.';
}

function buildPrivacyOutputBlockReply(language: AgentUiLanguage) {
  if (language === 'ru') {
    return 'Ответ агента содержал данные, похожие на персональные, поэтому он скрыт по соображениям безопасности. Переформулируй запрос более общо и без идентификаторов.';
  }

  if (language === 'en') {
    return 'The agent response appeared to contain personal data, so it has been withheld for safety. Please reformulate the request more generally and without identifiers.';
  }

  if (language === 'de') {
    return 'Die Antwort des Agenten schien personenbezogene Daten zu enthalten und wurde deshalb aus Sicherheitsgruenden ausgeblendet. Bitte formuliere die Anfrage allgemeiner und ohne Identifikatoren neu.';
  }

  return 'Agentin vastaus sisälsi henkilötietoihin viittaavia tietoja, joten sitä ei näytetä turvallisuussyistä. Muotoile pyyntö yleisemmin ilman tunnistetietoja ja yritä uudelleen.';
}

function buildEvidenceModeInstruction(config: UserClinicalEvidenceConfig) {
  const shared = [
    `Evidence operating mode: ${config.evidenceStrictness}.`,
    'Regional and source-selection settings are user-controlled workspace defaults and must be respected throughout the answer.',
  ];

  if (config.evidenceStrictness === 'strict') {
    return [
      ...shared,
      'Use only enabled official sources from the selected clinical country as the basis for clinical claims.',
      'Local workflow instructions may be mentioned only as operational context, never as justification for diagnosis, treatment choice, target values, dosing, contraindications, red flags, or referral thresholds.',
      'If retrieved evidence is missing or incomplete, stay conservative, state the uncertainty plainly, and do not fill gaps from general model knowledge.',
    ].join('\n');
  }

  if (config.evidenceStrictness === 'local-aware') {
    return [
      ...shared,
      'Use enabled official national sources first for clinical claims.',
      'Enabled local or hospital sources may supplement workflow framing, local process notes, or documentation conventions, but keep them clearly separate from national clinical recommendations.',
      'If official evidence is missing, do not turn local instructions into stand-in clinical authority.',
    ].join('\n');
  }

  return [
    ...shared,
    'Use enabled official sources first and keep them primary in the reasoning and wording.',
    'Supplementary enabled sources may be used only to add context or clarify implementation details, and you must preserve the distinction between official recommendations and supplementary material.',
    'Do not overstate certainty beyond the retrieved evidence.',
  ].join('\n');
}

function buildGroundingRetryInstruction(unsupportedClaims: string[]) {
  const claimsBlock = unsupportedClaims.length > 0
    ? unsupportedClaims.map((claim, index) => `${index + 1}. ${claim}`).join('\n')
    : 'No specific claims were extracted, but the previous answer exceeded the retrieved evidence.';

  return [
    'Revise the previous answer so that every clinical claim is directly grounded in the retrieved evidence and workspace settings.',
    'Remove, soften, or explicitly mark as uncertain any statement that is not supported by the available excerpts or approved source context.',
    'Do not add new unsupported claims during the rewrite.',
    'Claims flagged for revision:',
    claimsBlock,
  ].join('\n\n');
}

function outputPrivacyModeForAgentReply(
  taskType: AiTaskType,
  contextType: AgentContextType,
): PrivacyGatewayMode {
  if (
    contextType === 'clinicalText' ||
    contextType === 'clinicalReference' ||
    contextType === 'pikaohje' ||
    taskType === 'translation' ||
    taskType === 'clinical_document' ||
    taskType === 'clinical_review' ||
    taskType === 'clinical_reference' ||
    taskType === 'clinical_guideline_comparison' ||
    taskType === 'clinical_source_check' ||
    taskType === 'clinical_advice' ||
    taskType === 'medication_guidance' ||
    taskType === 'urgent_triage' ||
    taskType === 'referral_guidance' ||
    taskType === 'text_fix' ||
    taskType === 'lab_format'
  ) {
    return 'transientClinicalChat';
  }

  return 'generalText';
}

function buildTranslationRefinementInstruction(input: {
  userMessage: string;
  sourceText: string;
}) {
  return [
    'You are revising a clinical translation draft.',
    'Return only the final corrected translation in the intended target language.',
    'Preserve every source fact, negation, symptom, body location, laterality, duration, measurement, vital value, and temporal detail.',
    'Do not omit urinary symptoms, pain locations, denial/absence statements, or numeric values.',
    'Use natural clinician-facing note language in the target language, not a word-for-word translation.',
    'When the source says a symptom is denied or absent, keep the negation, but prefer the normal clinical note form of the target language over a literal denial verb if that reads more naturally.',
    'Do not add diagnoses, names, placeholders, demographic details, or explanatory commentary unless they are already present in the source text.',
    'If privacy placeholders such as [NAME], [DATE], [PHONE], or [EMAIL] are not present in the source text, do not introduce them.',
    'Honor any explicit user preference about note style or brevity only if all original facts remain intact.',
    'If the candidate translation is already correct, return it unchanged.',
    '',
    'Original user request:',
    input.userMessage || '(not provided)',
    '',
    'Source text:',
    input.sourceText || '(empty)',
  ].join('\n');
}

function buildEvidenceAvailabilityInstruction(params: {
  taskType: AiTaskType;
  status: string;
  registryOnlyReference: boolean;
  hasExcerpts: boolean;
}) {
  if (params.registryOnlyReference) {
    if (params.taskType === 'clinical_reference') {
      return [
        'Evidence communication rule:',
        'Exact official source passages are not currently available inside the provided material.',
        'Keep the answer high-level and verification-oriented.',
        'Use at most four short bullets and no nested lists.',
        'Do not turn the answer into a disease overview, detailed workup list, or treatment explainer.',
        'Prefer broad verification categories over exact test panels, thresholds, or source-language terminology unless they appear in the available evidence.',
        'Do not present disease-specific diagnostic or treatment details as settled official facts.',
        'Do not write long technical explanations about missing retrieval, backend limits, or pipeline behavior.',
      ].join('\n');
    }

    if (params.taskType === 'clinical_guideline_comparison') {
      return [
        'Evidence communication rule:',
        'Exact official source passages are not currently available inside the provided material.',
        'Return only a manual comparison checklist of what the clinician should verify in the configured official sources.',
        'Use three to five short bullets and no nested lists.',
        'Keep the bullets category-level and concise.',
        'Do not invent exact differences between recommendations.',
        'Do not write long technical explanations about missing retrieval, backend limits, or pipeline behavior.',
      ].join('\n');
    }

    return [
      'Evidence communication rule:',
      'Exact official source passages are not currently available inside the provided material.',
      'Do not write long technical explanations about missing retrieval, backend limits, or pipeline behavior.',
      'Give either a compact comparison/checklist framework or one short sentence saying that exact official passages still need manual checking in the configured sources.',
    ].join('\n');
  }

  if (params.status === 'partial' && params.hasExcerpts) {
    return [
      'Evidence communication rule:',
      'Use the supported points from the available excerpts.',
      'Do not enumerate every missing detail or describe system limitations at length.',
      'If something important remains uncertain, mention it in one brief final note only.',
    ].join('\n');
  }

  if (params.status === 'found' && params.hasExcerpts) {
    return [
      'Evidence communication rule:',
      'Answer from the available excerpts directly and confidently, but do not add claims that extend beyond them.',
      'Avoid commentary about the evidence retrieval process unless the user explicitly asks.',
    ].join('\n');
  }

  return [
    'Evidence communication rule:',
    'Keep any limitation note short, practical, and clinician-facing.',
    'Do not describe internal system behavior.',
  ].join('\n');
}

function shouldCompactReferenceEvidenceUi(params: {
  taskType: AiTaskType;
  status: string;
  hasExcerpts: boolean;
}) {
  return (
    (params.taskType === 'clinical_reference' ||
      params.taskType === 'clinical_guideline_comparison' ||
      params.taskType === 'clinical_source_check') &&
    params.status !== 'found' &&
    !params.hasExcerpts
  );
}

function compactRegistryOnlyBullet(line: string) {
  const raw = line.replace(/^\s*[-*•]\s+/, '').trim();
  if (!raw) return '';

  const primary = raw.split(/[:;]\s+/)[0]?.trim() ?? raw;
  const compact = primary
    .replace(/[.。]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return compact ? `- ${compact}.` : '';
}

function buildCompactRegistryOnlyLead(language: AgentUiLanguage, taskType: AiTaskType) {
  if (language === 'ru') {
    if (taskType === 'clinical_guideline_comparison') {
      return 'Кратко: в официальных источниках по этой теме вручную стоит сверить:';
    }

    return 'Кратко: в официальных источниках по этой теме вручную стоит проверить:';
  }

  if (language === 'fi') {
    if (taskType === 'clinical_guideline_comparison') {
      return 'Lyhyesti: virallisista lähteistä kannattaa tarkistaa käsin ainakin nämä vertailukohdat:';
    }

    return 'Lyhyesti: virallisista lähteistä kannattaa tarkistaa käsin ainakin nämä kohdat:';
  }

  if (language === 'de') {
    if (taskType === 'clinical_guideline_comparison') {
      return 'Kurz: In den offiziellen Quellen sollten dazu mindestens diese Vergleichspunkte manuell geprüft werden:';
    }

    return 'Kurz: In den offiziellen Quellen sollten dazu mindestens diese Punkte manuell geprüft werden:';
  }

  if (taskType === 'clinical_guideline_comparison') {
    return 'Briefly: in the official sources for this topic, these comparison points should be checked manually:';
  }

  return 'Briefly: in the official sources for this topic, these points should be checked manually:';
}

function buildCompactRegistryOnlyNote(
  language: AgentUiLanguage,
  sources: Array<{ name: string }>,
) {
  const sourceList = sources.slice(0, 3).map((source) => source.name).join(' / ') || 'official sources';

  if (language === 'ru') {
    return `Точные критерии, пороги и последовательность действий лучше сверить напрямую в ${sourceList}.`;
  }

  if (language === 'fi') {
    return `Tarkat kriteerit, raja-arvot ja etenemisjärjestys kannattaa varmistaa suoraan lähteistä ${sourceList}.`;
  }

  if (language === 'de') {
    return `Genaue Kriterien, Grenzwerte und Abläufe sollten direkt in ${sourceList} geprüft werden.`;
  }

  return `Exact criteria, thresholds, and step order should be verified directly in ${sourceList}.`;
}

function compactRegistryOnlyReply(input: {
  content: string;
  taskType: AiTaskType;
  language: AgentUiLanguage;
  sources: Array<{ name: string }>;
}) {
  const lines = input.content.replace(/\r/g, '').split('\n');
  const bulletLines = lines.filter((line) => /^\s*[-*•]\s+/.test(line));
  if (bulletLines.length === 0) return input.content.trim();

  const maxItems = input.taskType === 'clinical_guideline_comparison' ? 5 : 4;
  const compactBullets = uniqueStrings(
    bulletLines
      .map(compactRegistryOnlyBullet)
      .filter(Boolean)
  ).slice(0, maxItems);

  if (compactBullets.length === 0) return input.content.trim();

  return [
    buildCompactRegistryOnlyLead(input.language, input.taskType),
    '',
    ...compactBullets,
    '',
    buildCompactRegistryOnlyNote(input.language, input.sources),
  ].join('\n');
}

export async function POST(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;
  const startedAt = Date.now();

  const userId = Number((session?.user as any)?.id);

  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as AgentRequestBody;
    const contextType = normalizeContextType(body.contextType);
    const uiLanguage = normalizeUiLanguage(body.uiLanguage);
    const userMessage = optionalString(body.userMessage).trim();
    const currentText = optionalString(body.currentText);
    const currentTemplate = optionalString(body.currentTemplate);
    const conversationContext = buildConversationContext(body);
    const defaultInputKind = inputKindForContext(contextType);
    const currentTextKind = normalizePrivacyInputKind(
      body.currentTextKind,
      contextType === 'clinicalText' || contextType === 'pikaohje' ? 'clinicalText' : 'general',
    );
    const currentTemplateKind = normalizePrivacyInputKind(body.currentTemplateKind, 'templateSyntax');
    const conversationContextKind = normalizePrivacyInputKind(body.conversationContextKind, defaultInputKind);

    if (!userMessage && !currentText && !currentTemplate && !conversationContext) {
      return NextResponse.json({ error: 'Puuttuvat tiedot' }, { status: 400 });
    }

    const privacyResult = sanitizeAgentInputs([
      { key: 'userMessage', value: userMessage, kind: defaultInputKind },
      { key: 'currentText', value: currentText, kind: currentTextKind },
      { key: 'currentTemplate', value: currentTemplate, kind: currentTemplateKind },
      { key: 'conversationContext', value: conversationContext, kind: conversationContextKind },
    ]);

    if (privacyResult.privacy.blocked) {
      const reply = buildPrivacyBlockReply(uiLanguage);

      await logAiRunAudit({
        userId,
        surface: 'agent',
        taskType: 'privacy_block',
        contextType,
        privacyFindingTypes: Array.from(new Set([
          ...privacyResult.privacy.findingTypes,
          ...privacyResult.privacy.residualFindingTypes,
        ])),
        blockedByEvidenceGate: false,
        latencyMs: Date.now() - startedAt,
        success: true,
      });

      return NextResponse.json({
        reply,
        draft: reply,
        suggestedActions: [],
        taskType: 'privacy_block',
        provider: null,
        model: null,
        route: {
          taskType: 'privacy_block',
          requiresEvidence: false,
          blockedByPrivacyGate: true,
        },
        privacy: privacyResult.privacy,
        evidence: {
          status: 'not_required',
          level: 'privacy_block',
          clinicalCountry: '',
          clinicalOutputLanguage: uiLanguage,
          requiresEvidence: false,
          sources: [],
          warnings: [],
          unsupportedClaims: [],
        },
      });
    }

    const plan = createAgentPlan({
      contextType,
      userMessage: privacyResult.sanitized.userMessage,
      uiLanguage,
      currentText: privacyResult.sanitized.currentText,
      currentTemplate: privacyResult.sanitized.currentTemplate,
    });

    const clinicalConfigPromise = getUserClinicalEvidenceConfig(userId, { surface: 'agent' });
    const userAiProfilePromise = getUserAiProfile(userId);
    const clinicalConfig = await clinicalConfigPromise;
    const isClinicalResearchMode = contextType === 'clinicalResearch';
    const researchCountryResolution = isClinicalResearchMode
      ? resolveResearchCountries({
          selectedCountries: body.researchCountries,
          userMessage: privacyResult.sanitized.userMessage,
          currentText: privacyResult.sanitized.currentText,
          currentTemplate: privacyResult.sanitized.currentTemplate,
          fallbackCountry: clinicalConfig.clinicalCountry,
        })
      : null;

    if (isClinicalResearchMode && researchCountryResolution && researchCountryResolution.supported.length === 0) {
      const reply = localizeNoSupportedResearchCountryReply(uiLanguage, researchCountryResolution.unsupported);
      const evidence = {
        status: 'not_found' as const,
        level: 'insufficient_evidence' as const,
        clinicalCountry: researchCountryResolution.requested.map((country) => country.label).join(' + '),
        clinicalOutputLanguage: clinicalConfig.clinicalOutputLanguage,
        evidenceStrictness: clinicalConfig.evidenceStrictness,
        requiresEvidence: true,
        sources: [],
        excerpts: [],
        warnings: [localizeUnsupportedResearchCountriesWarning(uiLanguage, researchCountryResolution.unsupported)],
        unsupportedClaims: [],
      };

      await logAiRunAudit({
        userId,
        surface: 'agent',
        taskType: plan.taskType,
        contextType,
        clinicalCountry: evidence.clinicalCountry,
        evidenceStatus: evidence.status,
        privacyFindingTypes: Array.from(new Set([
          ...privacyResult.privacy.findingTypes,
          ...privacyResult.privacy.residualFindingTypes,
        ])),
        blockedByEvidenceGate: false,
        latencyMs: Date.now() - startedAt,
        success: true,
      });

      return NextResponse.json({
        reply,
        draft: reply,
        suggestedActions: plan.suggestedActions,
        taskType: plan.taskType,
        provider: null,
        model: null,
        route: {
          taskType: plan.taskType,
          requiresEvidence: true,
          blockedByEvidenceGate: false,
        },
        privacy: privacyResult.privacy,
        evidence,
      });
    }

    const [workspaceContext, userAiProfile, userAiSettings] = await Promise.all([
      getUserAiWorkspaceContext(userId, { clinicalConfig }),
      userAiProfilePromise,
      getUserAiSettings(userId),
    ]);
    const requiresEvidence = taskRequiresEvidence(plan.taskType);
    const allowsRegistryOnlyReference = taskAllowsRegistryOnlyReference(plan.taskType);
    let evidence: EvidencePackage;
    let localizedEvidence: EvidencePackage;

    if (isClinicalResearchMode && researchCountryResolution) {
      const researchConfigs = await Promise.all(
        researchCountryResolution.supported.map((countryCode) =>
          getUserClinicalEvidenceConfig(userId, {
            surface: 'agent',
            countryOverride: countryCode,
          })
        )
      );

      const retrievedEvidenceByCountry = await Promise.all(
        researchConfigs.map((config) =>
          retrieveClinicalEvidence({
            userId,
            taskType: plan.taskType,
            requiresEvidence: requiresEvidence || allowsRegistryOnlyReference,
            config,
            userMessage: privacyResult.sanitized.userMessage,
            currentText: privacyResult.sanitized.currentText,
            currentTemplate: privacyResult.sanitized.currentTemplate,
          })
        )
      );

      const countryEvidence = researchConfigs.map((config, index) => ({
        country: config.clinicalCountry,
        config,
        retrieved: retrievedEvidenceByCountry[index] as RetrievedEvidence,
        evidence: buildEvidencePackageFromRetrieved({
          taskType: plan.taskType,
          requiresEvidence: requiresEvidence || allowsRegistryOnlyReference,
          config,
          retrieved: retrievedEvidenceByCountry[index],
        }),
      }));

      evidence = mergeResearchEvidence({
        language: uiLanguage,
        taskType: plan.taskType,
        countryEvidence: countryEvidence.map((item) => ({
          country: item.country,
          config: item.config,
          evidence: item.evidence,
        })),
        unsupportedCountries: researchCountryResolution.unsupported,
      });
      localizedEvidence = evidence;
    } else {
      const retrievedEvidence = await retrieveClinicalEvidence({
        userId,
        taskType: plan.taskType,
        requiresEvidence: requiresEvidence || allowsRegistryOnlyReference,
        config: clinicalConfig,
        userMessage: privacyResult.sanitized.userMessage,
        currentText: privacyResult.sanitized.currentText,
        currentTemplate: privacyResult.sanitized.currentTemplate,
      });
      evidence = buildEvidencePackageFromRetrieved({
        taskType: plan.taskType,
        requiresEvidence: requiresEvidence || allowsRegistryOnlyReference,
        config: clinicalConfig,
        retrieved: retrievedEvidence,
      });
      localizedEvidence = {
        ...evidence,
        warnings: localizeEvidenceWarningList(uiLanguage, evidence.warnings, {
          status: evidence.status,
          registryOnlyReference: allowsRegistryOnlyReference &&
            (evidence.status === 'partial' || evidence.status === 'not_found'),
        }),
      };
    }

    const isRegistryOnlyReference =
      allowsRegistryOnlyReference &&
      (localizedEvidence.status === 'partial' || localizedEvidence.status === 'not_found');

    if (
      requiresEvidence &&
      !allowsRegistryOnlyReference &&
      (localizedEvidence.status === 'not_found' || localizedEvidence.status === 'partial')
    ) {
      const reply = buildNoEvidenceReply({
        clinicalCountry: localizedEvidence.clinicalCountry,
        language: uiLanguage,
        sources: localizedEvidence.sources,
      });

      await logAiRunAudit({
        userId,
        surface: 'agent',
        taskType: plan.taskType,
        contextType,
        clinicalCountry: localizedEvidence.clinicalCountry,
        evidenceStatus: localizedEvidence.status,
        privacyFindingTypes: Array.from(new Set([
          ...privacyResult.privacy.findingTypes,
          ...privacyResult.privacy.residualFindingTypes,
        ])),
        blockedByEvidenceGate: true,
        latencyMs: Date.now() - startedAt,
        success: true,
      });

      return NextResponse.json({
        reply,
        draft: reply,
        suggestedActions: plan.suggestedActions,
        taskType: plan.taskType,
        provider: null,
        model: null,
        route: {
          taskType: plan.taskType,
          requiresEvidence: true,
          blockedByEvidenceGate: true,
        },
        privacy: privacyResult.privacy,
        evidence: localizedEvidence,
      });
    }

    const auditClinicalCountry = localizedEvidence.clinicalCountry || clinicalConfig.clinicalCountry;
    const profileInstruction = buildUserAiProfileInstruction(
      userAiProfile,
      profileModeForTask(plan.taskType),
      workspaceContext,
    );
    const resolvedResponseLanguage = resolveResponseLanguage({
      userRequestText: privacyResult.sanitized.userMessage,
      preferredMode: userAiSettings.assistantResponseMode,
      preferredLanguage: userAiSettings.assistantFixedLanguage,
      fallbackUiLanguage: uiLanguage,
      fallbackClinicalLanguage: workspaceContext.clinicalOutputLanguage,
    });
    const evidenceContext = [
      buildWorkspaceContextInstruction(workspaceContext, {
        contentLabel: 'clinician-facing agent output',
        mentionCountryAdaptation: !isClinicalResearchMode,
      }),
      isClinicalResearchMode && researchCountryResolution
        ? buildResearchModeInstruction({
            language: uiLanguage,
            supportedCountries: researchCountryResolution.supported,
            unsupportedCountries: researchCountryResolution.unsupported,
            taskType: plan.taskType,
          })
        : '',
      `Final user-facing answer language for this response: ${languageLabel(resolvedResponseLanguage.language)} (${resolvedResponseLanguage.language}).`,
      'Match the language of the current user request by default. Switch only if the user explicitly asks for another language.',
      'Use other languages only for source names, very short quoted terms, or unavoidable original terminology.',
      isClinicalResearchMode
        ? [
            'Evidence operating mode: cross-country research.',
            'Workspace defaults still define UI and safety context, but do not replace explicitly requested research countries.',
            'Use only enabled official sources from each connected requested country when making claims about that country.',
          ].join('\n')
        : buildEvidenceModeInstruction(clinicalConfig),
      buildEvidenceAvailabilityInstruction({
        taskType: plan.taskType,
        status: localizedEvidence.status,
        registryOnlyReference: isRegistryOnlyReference,
        hasExcerpts: localizedEvidence.excerpts.length > 0,
      }),
      `Evidence status: ${localizedEvidence.status}`,
      `Registry-only reference mode: ${isRegistryOnlyReference ? 'yes' : 'no'}`,
      `Used sources: ${localizedEvidence.sources.map((source) => `${source.name} (${source.trustLevel})`).join(', ') || 'none'}`,
      localizedEvidence.excerpts.length > 0
        ? [
            'Retrieved evidence excerpts:',
            ...localizedEvidence.excerpts.map((excerpt, index) => [
              `Excerpt ${index + 1}: ${excerpt.title || excerpt.sourceId}`,
              excerpt.url ? `URL: ${excerpt.url}` : '',
              excerpt.text,
            ].filter(Boolean).join('\n')),
          ].join('\n\n')
        : '',
      isRegistryOnlyReference
        ? [
            'The official source registry is configured, but concrete source excerpts have not been automatically retrieved.',
            'For clinical reference or guideline comparison tasks, provide only a safe general framework, structure, and list of items to compare.',
            'Do not state exact guideline differences, target values, medication choices, dosages, treatment durations, red flags, contraindications, or referral thresholds unless they are present in retrieved evidence or a user-provided source excerpt.',
          ].join('\n')
        : '',
    ].filter(Boolean).join('\n\n');

    const messages = [
      profileInstruction ? { role: 'system' as const, content: profileInstruction } : null,
      { role: 'system' as const, content: plan.systemInstruction },
      { role: 'system' as const, content: evidenceContext },
      privacyResult.sanitized.conversationContext
        ? { role: 'system' as const, content: privacyResult.sanitized.conversationContext }
        : null,
      { role: 'user' as const, content: plan.userInstruction },
    ].filter((message): message is { role: 'system' | 'user'; content: string } => Boolean(message));

    let result = await runRoutedAiCompletion({
      userId,
      taskType: plan.taskType,
      messages,
      temperature: 0,
    });

    if (plan.taskType === 'translation') {
      const translationRefinementMessages = [
        {
          role: 'system' as const,
          content: buildTranslationRefinementInstruction({
            userMessage: privacyResult.sanitized.userMessage,
            sourceText: privacyResult.sanitized.currentText,
          }),
        },
        {
          role: 'user' as const,
          content: [
            'Candidate translation:',
            result.content.trim() || '(empty)',
          ].join('\n'),
        },
      ];

      const refinedTranslation = await runRoutedAiCompletion({
        userId,
        taskType: plan.taskType,
        messages: translationRefinementMessages,
        temperature: 0,
      });

      if (refinedTranslation.content.trim()) {
        result = refinedTranslation;
      }
    }

    const normalizedModelOutput = removeUnexpectedPrivacyPlaceholders({
      content: result.content,
      sourceText: privacyResult.sanitized.currentText,
      taskType: plan.taskType,
      contextType,
    });

    let outputPrivacy = preparePrivacyPayload([
      {
        key: 'output',
        value: normalizedModelOutput,
        mode: outputPrivacyModeForAgentReply(plan.taskType, contextType),
      },
    ]);
    let safeOutputContent = outputPrivacy.sanitized.output ?? normalizedModelOutput;

    if (
      outputPrivacy.privacy.blocked &&
      hasCriticalPrivacyFindingTypes([
        ...outputPrivacy.privacy.findingTypes,
        ...outputPrivacy.privacy.residualFindingTypes,
      ])
    ) {
      const reply = buildPrivacyOutputBlockReply(uiLanguage);

      await logAiRunAudit({
        userId,
        surface: 'agent',
        taskType: 'privacy_output_block',
        contextType,
        provider: result.provider,
        model: result.model,
        clinicalCountry: auditClinicalCountry,
        evidenceStatus: localizedEvidence.status,
        privacyFindingTypes: Array.from(new Set([
          ...privacyResult.privacy.findingTypes,
          ...privacyResult.privacy.residualFindingTypes,
          ...outputPrivacy.privacy.findingTypes,
          ...outputPrivacy.privacy.residualFindingTypes,
        ])),
        blockedByEvidenceGate: false,
        latencyMs: Date.now() - startedAt,
        success: true,
      });

      return NextResponse.json({
        reply,
        draft: reply,
        suggestedActions: [],
        taskType: 'privacy_output_block',
        provider: null,
        model: null,
        route: {
          taskType: 'privacy_output_block',
          requiresEvidence: false,
          blockedByPrivacyGate: true,
          blockedByOutputPrivacyGate: true,
        },
        privacy: privacyResult.privacy,
        evidence: localizedEvidence,
      });
    }

    let consistencyCheck = checkEvidenceConsistency({
      taskType: plan.taskType,
      answer: safeOutputContent,
      evidence: localizedEvidence,
      language: uiLanguage,
    });

    if (requiresEvidence && consistencyCheck.unsupportedClaims.length > 0) {
      const retryResult = await runRoutedAiCompletion({
        userId,
        taskType: plan.taskType,
        messages: [
          ...messages,
          { role: 'assistant', content: safeOutputContent },
          { role: 'system', content: buildGroundingRetryInstruction(consistencyCheck.unsupportedClaims) },
        ],
        temperature: 0,
      });

      const retryOutputPrivacy = preparePrivacyPayload([
        {
          key: 'output',
          value: retryResult.content,
          mode: outputPrivacyModeForAgentReply(plan.taskType, contextType),
        },
      ]);
      const retrySafeOutputContent = retryOutputPrivacy.sanitized.output ?? retryResult.content;

      if (
        !(
          retryOutputPrivacy.privacy.blocked &&
          hasCriticalPrivacyFindingTypes([
            ...retryOutputPrivacy.privacy.findingTypes,
            ...retryOutputPrivacy.privacy.residualFindingTypes,
          ])
        )
      ) {
        const retryConsistencyCheck = checkEvidenceConsistency({
          taskType: plan.taskType,
          answer: retrySafeOutputContent,
          evidence: localizedEvidence,
          language: uiLanguage,
        });

        if (
          retryConsistencyCheck.unsupportedClaims.length <= consistencyCheck.unsupportedClaims.length
        ) {
          result = retryResult;
          outputPrivacy = retryOutputPrivacy;
          safeOutputContent = retrySafeOutputContent;
          consistencyCheck = retryConsistencyCheck;
        }
      }
    }

    const compactReferenceEvidenceUi = shouldCompactReferenceEvidenceUi({
      taskType: plan.taskType,
      status: localizedEvidence.status,
      hasExcerpts: localizedEvidence.excerpts.length > 0,
    });
    const finalEvidenceWarnings = uniqueStrings([...localizedEvidence.warnings, ...consistencyCheck.warnings]);

    const finalEvidence = {
      ...localizedEvidence,
      warnings: compactReferenceEvidenceUi ? finalEvidenceWarnings.slice(0, 1) : finalEvidenceWarnings,
      unsupportedClaims: compactReferenceEvidenceUi ? [] : consistencyCheck.unsupportedClaims,
    };

    await logAiRunAudit({
      userId,
      surface: 'agent',
      taskType: plan.taskType,
      contextType,
      provider: result.provider,
      model: result.model,
      clinicalCountry: auditClinicalCountry,
      evidenceStatus: finalEvidence.status,
      privacyFindingTypes: Array.from(new Set([
        ...privacyResult.privacy.findingTypes,
        ...privacyResult.privacy.residualFindingTypes,
        ...outputPrivacy.privacy.findingTypes,
        ...outputPrivacy.privacy.residualFindingTypes,
      ])),
      blockedByEvidenceGate: false,
      latencyMs: Date.now() - startedAt,
      success: true,
    });

    const normalizedDisplayContent = normalizeReplyForDisplay(safeOutputContent);
    const displayContent = compactReferenceEvidenceUi
      ? compactRegistryOnlyReply({
          content: normalizedDisplayContent,
          taskType: plan.taskType,
          language: uiLanguage,
          sources: finalEvidence.sources,
        })
      : normalizedDisplayContent;
    const displayDraft = parseDraftFromContent(displayContent);

    return NextResponse.json({
      reply: displayContent,
      draft: displayDraft,
      suggestedActions: plan.suggestedActions,
      taskType: plan.taskType,
      provider: result.provider,
      model: result.model,
      route: {
        ...result.route,
        outputSanitized: outputPrivacy.privacy.anonymized,
      },
      privacy: privacyResult.privacy,
      evidence: finalEvidence,
    });
  } catch (err: any) {
    console.error('Agent API error:', err?.message || err);
    if (Number.isFinite(userId)) {
      await logAiRunAudit({
        userId,
        surface: 'agent',
        success: false,
        latencyMs: Date.now() - startedAt,
        errorCode: err?.message || 'agent_error',
      });
    }
    return NextResponse.json({ error: 'AI-agentin virhe', details: err?.message }, { status: 500 });
  }
}
