import {
  DEFAULT_PRIVACY_LOCALE_KEYS,
  resolvePrivacyLocalePacks,
  type PrivacyLocaleKey,
} from './packs';

export type PatientDataFindingType =
  | 'hetu'
  | 'email'
  | 'phone'
  | 'dateOfBirth'
  | 'patientId'
  | 'explicitName'
  | 'address';

export type AnonymizationMode =
  | 'chat'
  | 'profileSample'
  | 'storage'
  | 'transientClinicalChat'
  | 'generalText'
  | 'clinicalTransform'
  | 'clinicalBuilder'
  | 'persistentSample'
  | 'strictStorage';

export type AnonymizationOptions = {
  mode?: AnonymizationMode;
  localeKeys?: PrivacyLocaleKey[];
};

export type PatientDataFinding = {
  type: PatientDataFindingType;
  replacement: string;
  start: number;
  end: number;
};

export type PatientTextAnonymizationResult = {
  sanitizedText: string;
  findings: PatientDataFinding[];
  hasFindings: boolean;
  findingTypes: PatientDataFindingType[];
};

type InternalFinding = PatientDataFinding & {
  value: string;
};

type PatternRule = {
  type: PatientDataFindingType;
  replacement: string;
  pattern: RegExp;
};

function isStorageLikeMode(mode: AnonymizationMode) {
  return mode === 'storage' || mode === 'strictStorage' || mode === 'persistentSample';
}

function isStrictContextMode(mode: AnonymizationMode) {
  return (
    mode === 'profileSample' ||
    mode === 'storage' ||
    mode === 'clinicalTransform' ||
    mode === 'clinicalBuilder' ||
    mode === 'persistentSample' ||
    mode === 'strictStorage'
  );
}

function shouldRedactExactDates(mode: AnonymizationMode) {
  return isStorageLikeMode(mode) || mode === 'clinicalTransform' || mode === 'clinicalBuilder';
}

const CONTEXT_WINDOW_CHARS = 120;
const STRICT_CONTEXT_WINDOW_CHARS = 180;

const HETU_PATTERN = /\b\d{2}(?:0[1-9]|1[0-2])\d{2}(?:[+\-A-FU-Y])\d{3}[0-9A-Z]\b/g;
const DATE_PATTERN = /\b\d{1,4}[.,\/-]\d{1,2}[.,\/-]\d{1,4}\b/g;
const PHONE_PATTERN = /(?<!\d)(?:\+358|0)\s?(?:4\d|[1-9]\d?)\s?(?:\d\s?){5,8}(?!\d)/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const STAFF_CONTEXT_WORDS = 'lääkäri|laakari|hoitaja|sairaanhoitaja|terveydenhoitaja|lähihoitaja|lahihoitaja|fysioterapeutti|fysioterapeuti|toimintaterapeutti|puheterapeutti|psykologi|psykiatri|sosiaalityöntekijä|sosiaalityontekija|ravitsemusterapeutti|farmaseutti|proviisori|hammaslääkäri|hammaslaakari|suuhygienisti|kätilö|katilo|ensihoitaja|laboratoriohoitaja|röntgenhoitaja|rontgenhoitaja|ammattilainen|ammattihenkilö|ammattihenkilo';
const RELATIVE_CONTEXT_WORD_PATTERN = /^(?:vaimo|puoliso|aviopuoliso|äiti|isä|tytär|veli|sisko|sisar|omainen|lähiomainen|huoltaja)$/i;
const DEMOGRAPHIC_CONTEXT_WORD_PATTERN = /^(?:mies|nainen|tyttö|poika|lapsi)$/i;
const STAFF_CONTEXT_WORD_PATTERN = new RegExp(`^(?:${STAFF_CONTEXT_WORDS})$`, 'i');
const STAFF_ROLE_PATTERN = new RegExp(`\\b(?:${STAFF_CONTEXT_WORDS})\\b`, 'gi');
const UNICODE_LETTER_BOUNDARY_LEFT = '(?<![\\p{L}])';
const UNICODE_LETTER_BOUNDARY_RIGHT = '(?![\\p{L}])';
const NAME_TOKEN = "[\\p{Lu}][\\p{L}'’-]+";
const NAME_SEQUENCE = `${NAME_TOKEN}(?:\\s+${NAME_TOKEN}){1,3}`;
const NAME_AFTER_ROLE_PATTERN = new RegExp(`^\\s+${NAME_SEQUENCE}${UNICODE_LETTER_BOUNDARY_RIGHT}`, 'u');
const BARE_NAME_PATTERN = new RegExp(`${UNICODE_LETTER_BOUNDARY_LEFT}${NAME_SEQUENCE}${UNICODE_LETTER_BOUNDARY_RIGHT}`, 'gu');
const STANDALONE_FULL_NAME_PATTERN = new RegExp(`^\\s*${NAME_SEQUENCE}\\s*$`, 'u');
const localeRegexCache = new Map<string, {
  personContextPattern: RegExp;
  dateOfBirthPattern: RegExp;
  patientIdPattern: RegExp;
  explicitNamePattern: RegExp;
}>();

const NON_PERSON_NAME_PATTERNS = [
  /\bKeski\s+Uudenmaan\b/i,
  /\bKeski\s+Uusimaa\b/i,
  /\bHyvinkään\s+Sairaala\b/i,
  /\bHyvinkään\s+Sairaalassa\b/i,
  /\bMäntsälän\s+Terveyskeskus\b/i,
  /\bNurmijärven\s+Terveyskeskus\b/i,
  /\bKäypä\s+Hoito\b/i,
  /\bKäypä\s+hoito\b/i,
  /\bHUS\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+\b/,
  /\bHUSLAB\b/i,
  /\bHUS\s+Kuvantaminen\b/i,
  /\bKeusote\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+\b/,
  /\bMeilah(?:ti|den)\b/i,
  /\bPeijas\b/i,
  /\bJorvi\b/i,
  /\bSiltasairaala\b/i,
  /\bKiljava\b/i,
  /\bTerveysportti\b/i,
  /\bKanta\b/i,
];

function escapeRegexToken(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildLocaleRegexSet(localeKeys: PrivacyLocaleKey[]) {
  const key = localeKeys.slice().sort().join('|');
  const cached = localeRegexCache.get(key);
  if (cached) return cached;

  const packs = resolvePrivacyLocalePacks(localeKeys);
  const personContextWords = packs.flatMap((pack) => pack.personContextWords);
  const dateOfBirthLabels = packs.flatMap((pack) => pack.dateOfBirthLabels);
  const explicitNameLabels = packs.flatMap((pack) => pack.explicitNameLabels);
  const patientIdLabels = packs.flatMap((pack) => pack.patientIdLabels);

  const personContextPattern = new RegExp(
    `${UNICODE_LETTER_BOUNDARY_LEFT}(?:${[...personContextWords, STAFF_CONTEXT_WORDS].join('|')})${UNICODE_LETTER_BOUNDARY_RIGHT}`,
    'iu',
  );

  const dateOfBirthPattern = new RegExp(
    `${UNICODE_LETTER_BOUNDARY_LEFT}(${dateOfBirthLabels.join('|')})\\s*:?\\s*\\d{1,4}[.,\\/-]\\d{1,2}[.,\\/-]\\d{1,4}\\b`,
    'giu',
  );

  const patientIdPattern = new RegExp(
    `${UNICODE_LETTER_BOUNDARY_LEFT}(${patientIdLabels.map(escapeRegexToken).join('|')})\\s*:?\\s*[A-Z0-9-]{4,}\\b`,
    'giu',
  );

  const explicitNamePattern = new RegExp(
    `${UNICODE_LETTER_BOUNDARY_LEFT}(${explicitNameLabels.map(escapeRegexToken).join('|')})\\s*:?\\s*${NAME_SEQUENCE}${UNICODE_LETTER_BOUNDARY_RIGHT}`,
    'giu',
  );

  const built = {
    personContextPattern,
    dateOfBirthPattern,
    patientIdPattern,
    explicitNamePattern,
  };
  localeRegexCache.set(key, built);
  return built;
}

function buildPatternRules(localeKeys: PrivacyLocaleKey[]): PatternRule[] {
  const localeRegex = buildLocaleRegexSet(localeKeys);

  return [
    { type: 'hetu', replacement: '[HETU]', pattern: HETU_PATTERN },
    { type: 'email', replacement: '[EMAIL]', pattern: EMAIL_PATTERN },
    { type: 'phone', replacement: '[PHONE]', pattern: PHONE_PATTERN },
    {
      type: 'dateOfBirth',
      replacement: '$1 [DATE_OF_BIRTH]',
      pattern: localeRegex.dateOfBirthPattern,
    },
    {
      type: 'patientId',
      replacement: '$1 [PATIENT_ID]',
      pattern: localeRegex.patientIdPattern,
    },
    {
      type: 'explicitName',
      replacement: '$1 [NAME]',
      pattern: localeRegex.explicitNamePattern,
    },
    {
      type: 'address',
      replacement: '[ADDRESS]',
      pattern: /\b[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+(?:\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+){0,2}(?:katu|tie|kuja|polku|rinne|raitti|kaari|aukio|gatan|vägen|gränden|stigen|platsen)\s+\d{1,4}(?:\s?[-–]\s?\d{1,4})?(?:\s?[A-Za-zÅÄÖåäö])?(?:\s+(?:as|asunto|apt)\.?\s*\d{1,4})?(?:,?\s*\d{5}\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+)?\b/g,
    },
    {
      type: 'address',
      replacement: '$1 [ADDRESS]',
      pattern: /\b(osoite|postiosoite|asuu osoitteessa)\s*:?\s*[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+(?:\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+){0,3}\s+\d{1,4}(?:\s?[A-Za-zÅÄÖåäö])?\b/gi,
    },
    {
      type: 'address',
      replacement: '[ADDRESS]',
      pattern: /\bPL\s*\d{1,6}\s*,?\s*\d{5}\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+\b/g,
    },
  ];
}

function createFinding(type: PatientDataFindingType, value: string, replacement: string, start: number): InternalFinding {
  return { type, value, replacement, start, end: start + value.length };
}

function regexMatches(pattern: RegExp, value: string) {
  return new RegExp(pattern.source, pattern.flags.replace('g', '')).test(value);
}

function isLikelyOrganizationOrTerm(value: string) {
  return NON_PERSON_NAME_PATTERNS.some((pattern) => pattern.test(value));
}

function hasNearbyIdentifier(text: string, start: number, end: number, personContextPattern: RegExp, strict = false) {
  const windowSize = strict ? STRICT_CONTEXT_WINDOW_CHARS : CONTEXT_WINDOW_CHARS;
  const windowStart = Math.max(0, start - windowSize);
  const windowEnd = Math.min(text.length, end + windowSize);
  const nearby = text.slice(windowStart, windowEnd);

  return (
    regexMatches(HETU_PATTERN, nearby) ||
    regexMatches(PHONE_PATTERN, nearby) ||
    regexMatches(EMAIL_PATTERN, nearby) ||
    personContextPattern.test(nearby)
  );
}

function collectPatternMatches(text: string, patternRules: PatternRule[]): InternalFinding[] {
  const findings: InternalFinding[] = [];

  for (const rule of patternRules) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      if (!value.trim()) continue;
      const replacement = value.replace(rule.pattern, rule.replacement);
      findings.push(createFinding(rule.type, value, replacement, start));
    }
  }

  return findings;
}

function collectStaffNames(text: string): InternalFinding[] {
  const findings: InternalFinding[] = [];
  const roleRegex = new RegExp(STAFF_ROLE_PATTERN.source, STAFF_ROLE_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = roleRegex.exec(text)) !== null) {
    const roleStart = match.index;
    const roleEnd = roleStart + match[0].length;
    const afterRole = text.slice(roleEnd);
    const nameMatch = NAME_AFTER_ROLE_PATTERN.exec(afterRole);
    if (!nameMatch) continue;
    const value = text.slice(roleStart, roleEnd + nameMatch[0].length);
    if (isLikelyOrganizationOrTerm(value)) continue;
    findings.push(createFinding('explicitName', value, 'Ammattilainen [NAME]', roleStart));
  }

  return findings;
}

function collectBareDatesNearIdentifiers(text: string, mode: AnonymizationMode, personContextPattern: RegExp): InternalFinding[] {
  const findings: InternalFinding[] = [];
  const regex = new RegExp(DATE_PATTERN.source, DATE_PATTERN.flags);
  const strictMode = isStrictContextMode(mode);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;

    if (hasNearbyIdentifier(text, start, end, personContextPattern, strictMode)) {
      findings.push(createFinding('dateOfBirth', value, strictMode ? '[DATE]' : '[DATE_OF_BIRTH]', start));
    }
  }

  return findings;
}

function collectBareNamesNearIdentifiers(text: string, mode: AnonymizationMode, personContextPattern: RegExp): InternalFinding[] {
  const findings: InternalFinding[] = [];
  const regex = new RegExp(BARE_NAME_PATTERN.source, BARE_NAME_PATTERN.flags);
  const strictMode = isStrictContextMode(mode);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;

    if (isLikelyOrganizationOrTerm(value)) continue;
    if (!hasNearbyIdentifier(text, start, end, personContextPattern, strictMode)) continue;

    const [firstWord, ...remainingWords] = value.split(/\s+/);
    const isRelativeWord = remainingWords.length > 0 && RELATIVE_CONTEXT_WORD_PATTERN.test(firstWord);
    const isDemographicWord = remainingWords.length > 0 && DEMOGRAPHIC_CONTEXT_WORD_PATTERN.test(firstWord);
    const isStaffWord = remainingWords.length > 0 && STAFF_CONTEXT_WORD_PATTERN.test(firstWord);

    if (isRelativeWord) {
      findings.push(createFinding('explicitName', value, 'Omainen [NAME]', start));
      continue;
    }

    if (isStaffWord) {
      findings.push(createFinding('explicitName', value, 'Ammattilainen [NAME]', start));
      continue;
    }

    if (isDemographicWord) {
      const nameValue = remainingWords.join(' ');
      const nameStart = start + firstWord.length + value.slice(firstWord.length).search(/\S/);
      findings.push(createFinding('explicitName', nameValue, '[NAME]', nameStart));
      continue;
    }

    findings.push(createFinding('explicitName', value, '[NAME]', start));
  }

  return findings;
}

function collectStrictDates(text: string, mode: AnonymizationMode, personContextPattern: RegExp): InternalFinding[] {
  if (!shouldRedactExactDates(mode)) return [];

  const findings: InternalFinding[] = [];
  const regex = new RegExp(DATE_PATTERN.source, DATE_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;

    if (hasNearbyIdentifier(text, start, end, personContextPattern, true) || shouldRedactExactDates(mode)) {
      findings.push(createFinding('dateOfBirth', value, '[DATE]', start));
    }
  }

  return findings;
}

function collectStandaloneFullInputName(text: string, mode: AnonymizationMode): InternalFinding[] {
  const trimmed = text.trim();
  if (!trimmed || !STANDALONE_FULL_NAME_PATTERN.test(trimmed)) return [];
  if (isLikelyOrganizationOrTerm(trimmed)) return [];

  const start = text.indexOf(trimmed);
  if (start < 0) return [];

  return [createFinding('explicitName', trimmed, '[NAME]', start)];
}

function collectMatches(text: string, mode: AnonymizationMode, localeKeys: PrivacyLocaleKey[]): InternalFinding[] {
  const localeRegex = buildLocaleRegexSet(localeKeys);
  const patternRules = buildPatternRules(localeKeys);
  const findings = [
    ...collectPatternMatches(text, patternRules),
    ...collectStaffNames(text),
    ...collectBareDatesNearIdentifiers(text, mode, localeRegex.personContextPattern),
    ...collectBareNamesNearIdentifiers(text, mode, localeRegex.personContextPattern),
    ...collectStrictDates(text, mode, localeRegex.personContextPattern),
    ...collectStandaloneFullInputName(text, mode),
  ];

  return findings.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start);
  });
}

function removeOverlaps(findings: InternalFinding[]) {
  const accepted: InternalFinding[] = [];
  let lastEnd = -1;

  for (const finding of findings) {
    if (finding.start < lastEnd) continue;
    accepted.push(finding);
    lastEnd = finding.end;
  }

  return accepted;
}

export function anonymizePatientText(input: unknown, options: AnonymizationOptions = {}): PatientTextAnonymizationResult {
  const original = typeof input === 'string' ? input : '';
  const mode = options.mode ?? 'chat';
  const localeKeys = options.localeKeys ?? DEFAULT_PRIVACY_LOCALE_KEYS;
  const findings = removeOverlaps(collectMatches(original, mode, localeKeys));

  if (findings.length === 0) {
    return { sanitizedText: original, findings: [], hasFindings: false, findingTypes: [] };
  }

  let sanitizedText = '';
  let cursor = 0;

  for (const finding of findings) {
    sanitizedText += original.slice(cursor, finding.start);
    sanitizedText += finding.replacement;
    cursor = finding.end;
  }

  sanitizedText += original.slice(cursor);

  const publicFindings: PatientDataFinding[] = findings.map(({ value: _value, ...finding }) => finding);
  const findingTypes = Array.from(new Set(publicFindings.map((finding) => finding.type)));

  return { sanitizedText, findings: publicFindings, hasFindings: true, findingTypes };
}

export function mergeAnonymizationResults(results: PatientTextAnonymizationResult[]) {
  const findings = results.flatMap((result) => result.findings);
  const findingTypes = Array.from(new Set(results.flatMap((result) => result.findingTypes)));

  return { hasFindings: findings.length > 0, findings, findingTypes };
}
