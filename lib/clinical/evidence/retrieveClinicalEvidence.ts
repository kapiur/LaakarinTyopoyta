import type { AiTaskType } from '../../ai/taskTypes';
import type { UserClinicalEvidenceConfig } from './userClinicalSettings';
import { findCachedGuidelineDocuments, scoreCachedGuidelineDocuments, upsertGuidelineDocuments } from '../../literature/guidelineCache';
import { retrieveOfficialGuidelineEvidenceCandidates } from '../../literature/guidelineCompare';
import { runRoutedAiCompletion } from '../../ai/runRoutedAiCompletion';

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
const MAX_FETCH_FROM_CACHE_URLS = 2;
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
const QUERY_STOP_WORDS = new Set([
  'and', 'the', 'for', 'with', 'from', 'into', 'this', 'that', 'what', 'which', 'about',
  'guideline', 'guidelines', 'recommendation', 'recommendations', 'clinical', 'patient', 'patients',
  'compare', 'comparison', 'research', 'study',
  'yleinen', 'yleiskuva', 'suositus', 'suositukset', 'kliininen', 'potilas', 'potilaat',
  'vertaa', 'vertailu', 'tutkimus',
  'общая', 'общие', 'рекомендация', 'рекомендации', 'клинический', 'пациент', 'пациенты',
  'сравни', 'сравнение', 'исследование',
  'vergleich', 'vergleiche', 'forschung',
]);

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeForQuery(value: string) {
  return value
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/[^a-z0-9а-яёäöå\s]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractQueryTerms(...inputs: string[]) {
  return uniqueStrings(
    inputs
      .flatMap((input) => normalizeForQuery(input).split(' '))
      .map((term) => term.trim())
      .filter((term) => term.length >= 3 && !QUERY_STOP_WORDS.has(term)),
  ).slice(0, 16);
}

function deriveEvidenceSearchQuery(input: {
  userMessage: string;
  currentText: string;
  currentTemplate?: string;
}) {
  const userMessage = input.userMessage.trim();
  if (userMessage.length >= 6) return userMessage;

  const currentText = normalizeWhitespace(input.currentText).slice(0, 240);
  if (currentText.length >= 12) return currentText;

  const currentTemplate = normalizeWhitespace(input.currentTemplate || '').slice(0, 240);
  return currentTemplate;
}

function containsCyrillic(value: string) {
  return /[А-Яа-яЁё]/.test(value);
}

function sanitizeSearchQueryCandidate(content: string) {
  const cleaned = content
    .trim()
    .replace(/^```[\w-]*\s*/i, '')
    .replace(/\s*```$/i, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || '';

  return cleaned
    .replace(/^(query|search terms|hakusanat|suchbegriffe)\s*[:\-]\s*/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
}

async function maybeRewriteOfficialSearchQuery(input: {
  userId?: number;
  searchQuery: string;
  config: UserClinicalEvidenceConfig;
}) {
  const query = input.searchQuery.trim();
  if (!query || !input.userId) return query;

  const targetLanguage = input.config.clinicalCountry === 'FI'
    ? 'Finnish'
    : input.config.clinicalCountry === 'DE'
      ? 'German'
      : input.config.clinicalCountry === 'RU'
        ? 'Russian'
        : input.config.clinicalOutputLanguage;

  const shouldRewrite =
    (input.config.clinicalCountry === 'FI' || input.config.clinicalCountry === 'DE') &&
    containsCyrillic(query);

  if (!shouldRewrite) return query;

  try {
    const result = await runRoutedAiCompletion({
      userId: input.userId,
      taskType: 'translation',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: [
            'You rewrite short clinical reference questions into compact official-guideline search terms.',
            `Translate into ${targetLanguage}.`,
            'Preserve the clinical topic conservatively.',
            'Prefer short terminology suitable for official site search.',
            'Return one plain line only, without explanation or markdown.',
          ].join(' '),
        },
        {
          role: 'user',
          content: query,
        },
      ],
    });

    const rewritten = sanitizeSearchQueryCandidate(result.content);
    return rewritten.length >= 3 ? rewritten : query;
  } catch {
    return query;
  }
}

function normalizeWhitespace(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function truncateAtBoundary(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const lastBreak = Math.max(
    slice.lastIndexOf('\n\n'),
    slice.lastIndexOf('. '),
    slice.lastIndexOf('; '),
  );

  return normalizeWhitespace((lastBreak > maxLength * 0.6 ? slice.slice(0, lastBreak + 1) : slice).trim());
}

function splitParagraphs(text: string) {
  return normalizeWhitespace(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 40);
}

function countTermHits(text: string, queryTerms: string[]) {
  const haystack = text.toLowerCase();
  return queryTerms.reduce((score, term) => (haystack.includes(term.toLowerCase()) ? score + 1 : score), 0);
}

function buildExpandedQueryTerms(input: {
  userMessage: string;
  currentText: string;
  currentTemplate?: string;
  searchQueries: string[];
}) {
  return uniqueStrings([
    ...extractQueryTerms(input.userMessage, input.currentText, input.currentTemplate || ''),
    ...extractQueryTerms(...input.searchQueries),
  ]).slice(0, 20);
}

function buildRelevantExcerpt(text: string, queryTerms: string[], maxLength = MAX_FETCHED_TEXT_CHARS) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return '';

  const paragraphs = splitParagraphs(normalized);
  if (paragraphs.length === 0) return truncateAtBoundary(normalized, maxLength);
  if (queryTerms.length === 0) return truncateAtBoundary(normalized, maxLength);
  const minRequiredHits = queryTerms.length >= 2 ? 2 : 1;

  const scored = paragraphs
    .map((paragraph, index) => ({
      index,
      paragraph,
      score: countTermHits(paragraph, queryTerms),
    }))
    .filter((item) => item.score >= minRequiredHits)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    });

  if (scored.length === 0) {
    return '';
  }

  const selectedIndexes = new Set<number>();
  for (const item of scored.slice(0, 3)) {
    selectedIndexes.add(item.index);
    if (item.index > 0) selectedIndexes.add(item.index - 1);
    if (item.index < paragraphs.length - 1) selectedIndexes.add(item.index + 1);
  }

  const excerpt = Array.from(selectedIndexes)
    .sort((left, right) => left - right)
    .map((index) => paragraphs[index])
    .join('\n\n');

  return truncateAtBoundary(excerpt || normalized, maxLength);
}

function excerptFromCachedDocument(
  document: Awaited<ReturnType<typeof findCachedGuidelineDocuments>>[number],
  config: UserClinicalEvidenceConfig,
  queryTerms: string[],
) {
  const source = config.allowedSources.find((item) => item.id === document.sourceId);
  const fullText = document.normalizedText ?? document.rawText ?? '';
  const text = buildRelevantExcerpt(fullText, queryTerms);
  if (!source || !text) return null;

  return {
    source: {
      id: source.id,
      name: source.name,
      sourceType: source.sourceType,
      trustLevel: source.trustLevel,
      baseUrl: source.baseUrl,
    },
    excerpt: {
      sourceId: source.id,
      title: document.title,
      url: document.sourceUrl,
      text,
      retrievedAt: document.lastSyncedAt.toISOString(),
    },
  };
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
  rawText: string;
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
  const rawText = normalizeWhitespace(contentType.includes('html') ? stripHtml(raw) : raw);
  const text = truncateAtBoundary(rawText, MAX_FETCHED_TEXT_CHARS);

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
    rawText,
  };
}

async function fetchCachedDocumentExcerpt(
  document: Awaited<ReturnType<typeof findCachedGuidelineDocuments>>[number],
  config: UserClinicalEvidenceConfig,
  queryTerms: string[],
) {
  const fetched = await fetchAllowedSourceExcerpt(document.sourceUrl, config);
  if (!fetched) return null;

  const focusedText = buildRelevantExcerpt(fetched.rawText, queryTerms);
  if (!focusedText) return null;

  await upsertGuidelineDocuments([
    {
      sourceId: document.sourceId,
      country: document.country,
      externalId: document.externalId,
      sourceUrl: document.sourceUrl,
      title: document.title,
      searchQuery: document.searchQuery,
      publishedAt: document.publishedAt,
      rawText: fetched.rawText,
      normalizedText: fetched.rawText,
      syncStatus: 'ready',
    },
  ]);

  return {
    source: fetched.source,
    excerpt: {
      ...fetched.excerpt,
      title: document.title || fetched.excerpt.title,
      text: focusedText,
    },
  };
}

export async function retrieveClinicalEvidence(input: {
  userId?: number;
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
  const searchQuery = deriveEvidenceSearchQuery(input);
  const localizedSearchQuery =
    input.config.hasOfficialSources && searchQuery
      ? await maybeRewriteOfficialSearchQuery({
          userId: input.userId,
          searchQuery,
          config: input.config,
        })
      : searchQuery;
  const queryTerms = buildExpandedQueryTerms({
    userMessage: input.userMessage,
    currentText: input.currentText,
    currentTemplate: input.currentTemplate,
    searchQueries: [searchQuery, localizedSearchQuery].filter(Boolean),
  });

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

  if (excerpts.length < MAX_EXCERPTS && input.config.hasOfficialSources) {
    try {
      const cachedDocuments = await findCachedGuidelineDocuments({
        country: input.config.clinicalCountry,
        sourceIds: input.config.allowedSources.map((source) => source.id),
        limit: 40,
      });
      const scoredDocuments = scoreCachedGuidelineDocuments(cachedDocuments, queryTerms);

      for (const document of scoredDocuments) {
        if (excerpts.length >= MAX_EXCERPTS) break;
        if (document.syncStatus !== 'ready') continue;
        const cached = excerptFromCachedDocument(document, input.config, queryTerms);
        if (!cached) continue;
        if (excerpts.some((excerpt) => excerpt.url && excerpt.url === cached.excerpt.url)) continue;
        excerptSources.set(cached.source.id, cached.source);
        excerpts.push(cached.excerpt);
      }

      if (excerpts.length < MAX_EXCERPTS) {
        let fetchedCount = 0;

        for (const document of scoredDocuments) {
          if (excerpts.length >= MAX_EXCERPTS) break;
          if (fetchedCount >= MAX_FETCH_FROM_CACHE_URLS) break;
          if (document.syncStatus === 'ready' && (document.rawText || document.normalizedText)) continue;

          try {
            const fetched = await fetchCachedDocumentExcerpt(document, input.config, queryTerms);
            fetchedCount += 1;
            if (!fetched) continue;
            if (excerpts.some((excerpt) => excerpt.url && excerpt.url === fetched.excerpt.url)) continue;
            excerptSources.set(fetched.source.id, fetched.source);
            excerpts.push(fetched.excerpt);
          } catch (error: any) {
            warnings.push(`Could not refresh cached guideline source ${document.sourceUrl}: ${error?.message || 'Unknown error'}`);
          }
        }
      }
    } catch (error: any) {
      warnings.push(`Could not load cached guideline evidence: ${error?.message || 'Unknown error'}`);
    }
  }

  if (excerpts.length < MAX_EXCERPTS && input.config.hasOfficialSources && localizedSearchQuery) {
    try {
      const liveCandidates = await retrieveOfficialGuidelineEvidenceCandidates(
        input.config,
        localizedSearchQuery,
        { limit: MAX_EXCERPTS - excerpts.length },
      );

      for (const candidate of liveCandidates) {
        if (excerpts.length >= MAX_EXCERPTS) break;
        const focusedText = buildRelevantExcerpt(candidate.excerpt || '', queryTerms);
        if (!focusedText) continue;
        if (excerpts.some((excerpt) => excerpt.url && excerpt.url === candidate.sourceUrl)) continue;

        const source = input.config.allowedSources.find((item) => item.id === candidate.sourceId);
        if (!source) continue;

        excerptSources.set(candidate.sourceId, {
          id: source.id,
          name: source.name,
          sourceType: source.sourceType,
          trustLevel: source.trustLevel,
          baseUrl: source.baseUrl,
        });
        excerpts.push({
          sourceId: candidate.sourceId,
          title: candidate.sourceTitle,
          url: candidate.sourceUrl,
          text: focusedText,
          retrievedAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      warnings.push(`Could not retrieve live guideline evidence: ${error?.message || 'Unknown error'}`);
    }
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
      const focusedText = buildRelevantExcerpt(fetched.rawText, queryTerms);
      if (!focusedText) continue;
      excerpts.push({
        ...fetched.excerpt,
        text: focusedText,
      });
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
