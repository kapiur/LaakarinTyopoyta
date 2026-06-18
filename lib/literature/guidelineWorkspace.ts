import type { LiteratureArticle } from './types';

export type LiteratureGuidelineSource = {
  id: string;
  name: string;
  trustLevel: string;
  sourceType: string;
  language: string[];
  baseUrl?: string;
};

export type LiteratureGuidelineWorkspaceItem = {
  id: string;
  name: string;
  trustLevel: string;
  sourceType: string;
  baseUrl?: string;
  language: string[];
  roleKey:
    | 'guideline'
    | 'reference'
    | 'publicHealth'
    | 'drugReference'
    | 'localInstruction'
    | 'general';
  checkKey:
    | 'guideline'
    | 'reference'
    | 'publicHealth'
    | 'drugReference'
    | 'localInstruction'
    | 'general';
  searchHint: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function stripPunctuation(value: string) {
  return value.replace(/[.,;:!?()[\]{}"'`~@#$%^&*_+=\\/<>|]+/g, ' ');
}

function buildTitleFallback(title: string) {
  const normalized = normalizeWhitespace(stripPunctuation(title));
  if (!normalized) return '';
  return normalized
    .split(/\s+/)
    .slice(0, 10)
    .join(' ');
}

function buildSearchHint(query: string | undefined, article: LiteratureArticle | null | undefined) {
  const normalizedQuery = normalizeWhitespace(query ?? '');
  if (normalizedQuery) return normalizedQuery;
  if (article?.title) return buildTitleFallback(article.title);
  return '';
}

function roleKeyForSourceType(sourceType: string, trustLevel: string): LiteratureGuidelineWorkspaceItem['roleKey'] {
  if (sourceType === 'national_guideline' || trustLevel === 'primary_guideline') return 'guideline';
  if (sourceType === 'medical_reference') return 'reference';
  if (sourceType === 'public_health_authority') return 'publicHealth';
  if (sourceType === 'drug_database') return 'drugReference';
  if (sourceType === 'local_instruction' || sourceType === 'hospital_instruction' || trustLevel === 'local_instruction') {
    return 'localInstruction';
  }
  return 'general';
}

function checkKeyForRole(roleKey: LiteratureGuidelineWorkspaceItem['roleKey']) {
  return roleKey;
}

export function buildGuidelineWorkspace(input: {
  article?: LiteratureArticle | null;
  searchQuery?: string;
  officialSources: LiteratureGuidelineSource[];
}) {
  const searchHint = buildSearchHint(input.searchQuery, input.article);

  return input.officialSources.map((source) => {
    const roleKey = roleKeyForSourceType(source.sourceType, source.trustLevel);
    return {
      id: source.id,
      name: source.name,
      trustLevel: source.trustLevel,
      sourceType: source.sourceType,
      baseUrl: source.baseUrl,
      language: source.language,
      roleKey,
      checkKey: checkKeyForRole(roleKey),
      searchHint,
    } satisfies LiteratureGuidelineWorkspaceItem;
  });
}
