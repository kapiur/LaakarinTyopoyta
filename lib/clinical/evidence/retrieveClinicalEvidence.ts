import type { AiTaskType } from '../../ai/taskTypes';
import type { UserClinicalEvidenceConfig } from './userClinicalSettings';

export type RetrievedEvidenceSource = {
  id: string;
  name: string;
  sourceType: string;
  trustLevel: string;
  baseUrl?: string;
};

export type RetrievedEvidenceExcerpt = {
  sourceId: string;
  title?: string;
  url?: string;
  text: string;
  retrievedAt: string;
};

export type RetrievedEvidence = {
  status: 'found' | 'partial' | 'not_found' | 'not_required';
  sources: RetrievedEvidenceSource[];
  excerpts: RetrievedEvidenceExcerpt[];
  warnings: string[];
};

const MAX_FETCHED_TEXT_CHARS = 6000;
const MAX_EXCERPTS = 3;
const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;
const SOURCE_MARKERS = [
  'käypä hoito',
  'kaypahoito',
  'terveyskirjasto',
  'lääkärikirja',
  'duodecim',
  'thl',
  'hus',
  'keusote',
  'minzdrav',
  'минздрав',
  'клинические рекомендации',
  'государственный реестр лекарственных средств',
  'грлс',
  'rospotrebnadzor',
  'роспотребнадзор',
  'suositus',
  'hoitosuositus',
  'ohje',
  'lähde',
  'source',
  'guideline',
  'recommendation',
  'рекомендац',
  'инструкция',
  'официальн',
];

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeWhitespace(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function stripHtml(raw: string) {
  return normalizeWhitespace(
    raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6|tr)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'"),
  );
}

function looksLikeUserProvidedExcerpt(text: string) {
  const normalized = text.toLowerCase();
  const compactLength = normalized.replace(/\s+/g, ' ').trim().length;
  if (compactLength < 300) return false;
  return SOURCE_MARKERS.some((marker) => normalized.includes(marker));
}

function extractUrls(...inputs: string[]) {
  const matches = inputs
    .flatMap((input) => Array.from(input.matchAll(URL_PATTERN)).map((match) => match[0] || ''))
    .map((value) => value.replace(/[),.;]+$/, ''));
  return uniqueStrings(matches);
}

function hostnameAllowed(hostname: string, config: UserClinicalEvidenceConfig) {
  const normalized = hostname.toLowerCase();
  return config.allowedSources.some((source) =>
    source.allowedDomains.some((domain) => normalized === domain.toLowerCase() || normalized.endsWith(`.${domain.toLowerCase()}`)),
  );
}

function sourceForUrl(url: URL, config: UserClinicalEvidenceConfig) {
  return (
    config.allowedSources.find((source) =>
      source.allowedDomains.some((domain) => {
        const normalized = url.hostname.toLowerCase();
        const allowed = domain.toLowerCase();
        return normalized === allowed || normalized.endsWith(`.${allowed}`);
      }),
    ) ?? null
  );
}

async function fetchAllowedSourceExcerpt(rawUrl: string, config: UserClinicalEvidenceConfig): Promise<{
  source: RetrievedEvidenceSource;
  excerpt: RetrievedEvidenceExcerpt;
} | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (!hostnameAllowed(url.hostname, config)) return null;

  const matchingSource = sourceForUrl(url, config);
  if (!matchingSource) return null;

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'text/html, text/plain;q=0.9, application/xhtml+xml;q=0.8',
      'User-Agent': 'LaakarinTyopoytaAgent/1.0',
    },
    signal: AbortSignal.timeout(7000),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Fetch failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  const text = normalizeWhitespace(contentType.includes('html') ? stripHtml(raw) : raw).slice(0, MAX_FETCHED_TEXT_CHARS);

  if (!text) {
    throw new Error('Fetched page did not produce readable text');
  }

  return {
    source: {
      id: matchingSource.id,
      name: matchingSource.name,
      sourceType: matchingSource.sourceType,
      trustLevel: matchingSource.trustLevel,
      baseUrl: matchingSource.baseUrl,
    },
    excerpt: {
      sourceId: matchingSource.id,
      title: matchingSource.name,
      url: url.toString(),
      text,
      retrievedAt: new Date().toISOString(),
    },
  };
}

export async function retrieveClinicalEvidence(input: {
  taskType: AiTaskType;
  requiresEvidence: boolean;
  config: UserClinicalEvidenceConfig;
  userMessage: string;
  currentText: string;
  currentTemplate?: string;
}) : Promise<RetrievedEvidence> {
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
      sources,
      excerpts: [],
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const excerpts: RetrievedEvidenceExcerpt[] = [];
  const excerptSources = new Map<string, RetrievedEvidenceSource>();

  if (looksLikeUserProvidedExcerpt(input.currentText)) {
    excerptSources.set('user-provided-source-excerpt', {
      id: 'user-provided-source-excerpt',
      name: 'User-provided source excerpt',
      sourceType: 'user_provided_excerpt',
      trustLevel: 'user_provided_not_independently_verified',
    });
    excerpts.push({
      sourceId: 'user-provided-source-excerpt',
      title: 'User-provided source excerpt',
      text: normalizeWhitespace(input.currentText).slice(0, MAX_FETCHED_TEXT_CHARS),
      retrievedAt: new Date().toISOString(),
    });
  }

  const urls = extractUrls(input.userMessage, input.currentText, input.currentTemplate || '').slice(0, MAX_EXCERPTS);
  for (const rawUrl of urls) {
    try {
      const fetched = await fetchAllowedSourceExcerpt(rawUrl, input.config);
      if (!fetched) {
        warnings.push(`Skipped non-allowed source URL: ${rawUrl}`);
        continue;
      }

      excerptSources.set(fetched.source.id, fetched.source);
      excerpts.push(fetched.excerpt);
      if (excerpts.length >= MAX_EXCERPTS) break;
    } catch (error: any) {
      warnings.push(`Could not retrieve source URL ${rawUrl}: ${error?.message || 'Unknown error'}`);
    }
  }

  if (excerpts.length > 0) {
    return {
      status: 'found',
      sources: [
        ...sources,
        ...Array.from(excerptSources.values()).filter((source) => !sources.some((existing) => existing.id === source.id)),
      ],
      excerpts,
      warnings,
    };
  }

  if (!input.config.hasOfficialSources) {
    return {
      status: 'not_found',
      sources,
      excerpts: [],
      warnings: warnings.length > 0 ? warnings : ['No enabled official clinical sources are available for the selected country.'],
    };
  }

  return {
    status: 'partial',
    sources,
    excerpts: [],
    warnings,
  };
}
