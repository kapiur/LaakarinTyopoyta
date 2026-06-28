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
  return isStorageLikeMode(mode);
}

function hasNearbyBareDateOfBirthContext(
  text: string,
  start: number,
  end: number,
  strict = false,
) {
  const windowSize = strict ? STRICT_CONTEXT_WINDOW_CHARS : CONTEXT_WINDOW_CHARS;
  const windowStart = Math.max(0, start - windowSize);
  const windowEnd = Math.min(text.length, end + windowSize);
  const nearby = text.slice(windowStart, windowEnd);

  return regexMatches(HETU_PATTERN, nearby);
}

const CONTEXT_WINDOW_CHARS = 120;
const STRICT_CONTEXT_WINDOW_CHARS = 180;

const HETU_PATTERN = /\b\d{2}(?:0[1-9]|1[0-2])\d{2}(?:[+\-A-FU-Y])\d{3}[0-9A-Z]\b/g;
const DATE_PATTERN = /\b\d{1,4}[.,\/-]\d{1,2}[.,\/-]\d{1,4}\b/g;
const PHONE_PATTERN = /(?<!\d)(?:\+358|0)\s?(?:4\d|[1-9]\d?)\s?(?:\d\s?){5,8}(?!\d)/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const STAFF_CONTEXT_WORDS = 'lääkäri|laakari|hoitaja|sairaanhoitaja|terveydenhoitaja|lähihoitaja|lahihoitaja|fysioterapeutti|fysioterapeuti|toimintaterapeutti|puheterapeutti|psykologi|psykiatri|sosiaalityöntekijä|sosiaalityontekija|ravitsemusterapeutti|farmaseutti|proviisori|hammaslääkäri|hammaslaakari|suuhygienisti|kätilö|katilo|ensihoitaja|laboratoriohoitaja|röntgenhoitaja|rontgenhoitaja|ammattilainen|ammattihenkilö|ammattihenkilo';
const PATIENT_ROLE_WORDS = [
  'potilas',
  'patient',
  'пациент',
  'пациентка',
  'patientin',
  'patienten',
].join('|');
const RELATIVE_CONTEXT_WORD_PATTERN = /^(?:vaimo|puoliso|aviopuoliso|äiti|isä|tytär|veli|sisko|sisar|omainen|lähiomainen|huoltaja)$/i;
const DEMOGRAPHIC_CONTEXT_WORD_PATTERN = /^(?:mies|nainen|tyttö|poika|lapsi)$/i;
const STAFF_CONTEXT_WORD_PATTERN = new RegExp(`^(?:${STAFF_CONTEXT_WORDS})$`, 'i');
const STAFF_CONTEXT_HINT_PATTERN = new RegExp(STAFF_CONTEXT_WORDS, 'i');
const PATIENT_ROLE_CONTEXT_WORD_PATTERN = new RegExp(`^(?:${PATIENT_ROLE_WORDS})$`, 'iu');
const STAFF_ROLE_PATTERN = new RegExp(`\\b(?:${STAFF_CONTEXT_WORDS})\\b`, 'gi');
const PATIENT_ROLE_PATTERN = new RegExp(`\\b(?:${PATIENT_ROLE_WORDS})\\b`, 'giu');
const UNICODE_LETTER_BOUNDARY_LEFT = '(?<![\\p{L}])';
const UNICODE_LETTER_BOUNDARY_RIGHT = '(?![\\p{L}])';
const NAME_TOKEN_SEPARATOR = '[ \\t]+';
const NAME_TOKEN = "[\\p{Lu}][\\p{L}'’-]+";
const NAME_SEQUENCE = `${NAME_TOKEN}(?:${NAME_TOKEN_SEPARATOR}${NAME_TOKEN}){1,3}`;
const SHORT_NAME_SEQUENCE = `${NAME_TOKEN}(?:${NAME_TOKEN_SEPARATOR}${NAME_TOKEN}){0,2}`;
const COMMA_NAME_SEQUENCE = `${NAME_TOKEN},${NAME_TOKEN_SEPARATOR}${NAME_TOKEN}(?:${NAME_TOKEN_SEPARATOR}${NAME_TOKEN}){0,2}`;
const NAME_AFTER_ROLE_PATTERN = new RegExp(`^\\s+${NAME_SEQUENCE}${UNICODE_LETTER_BOUNDARY_RIGHT}`, 'u');
const BARE_NAME_PATTERN = new RegExp(`${UNICODE_LETTER_BOUNDARY_LEFT}${NAME_SEQUENCE}${UNICODE_LETTER_BOUNDARY_RIGHT}`, 'gu');
const COMMA_NAME_PATTERN = new RegExp(`${UNICODE_LETTER_BOUNDARY_LEFT}${COMMA_NAME_SEQUENCE}${UNICODE_LETTER_BOUNDARY_RIGHT}`, 'gu');
const STANDALONE_FULL_NAME_PATTERN = new RegExp(`^\\s*${NAME_SEQUENCE}\\s*$`, 'u');
const localeRegexCache = new Map<string, {
  personContextPattern: RegExp;
  dateOfBirthPattern: RegExp;
  patientIdPattern: RegExp;
  explicitNamePattern: RegExp;
  labeledPhonePattern: RegExp;
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
const SUSPICIOUS_EXPLICIT_NAME_VALUE_PATTERN = /\b(?:osoite|osoitteessa|postiosoite|address|street|ул\.?|улица|проспект|пр-т|переулок|набережная|бульвар|шоссе|кв\.?|квартира|apt|apartment|suite|ste|asunto|as)\b|\d/i;
const PRIVACY_PLACEHOLDER_PATTERN = /\[(?:NAME|HETU|DATE_OF_BIRTH|DATE|PHONE|EMAIL|ADDRESS|PATIENT_ID|PROFESSIONAL_NAME)\]/i;
const CLINICAL_SECTION_HEADING_WORDS = new Set([
  'esitiedot',
  'nykytila',
  'suunnitelma',
  'diagnoosi',
  'tutkimukset',
  'hoidon',
  'hoito',
  'tulosyy',
  'käyntisyy',
  'etäkontakti',
  'yle',
  'hoi',
  'lab',
  'muu',
  'merkintä',
  'kts',
  'katso',
]);

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
  const phoneLabels = packs.flatMap((pack) => pack.phoneLabels);
  const phoneValuePatterns = packs.flatMap((pack) => pack.phoneValuePatterns);

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

  const labeledPhonePattern = new RegExp(
    `${UNICODE_LETTER_BOUNDARY_LEFT}(${phoneLabels.map(escapeRegexToken).join('|')})\\s*:?\\s*((?:${phoneValuePatterns.join('|')}))`,
    'giu',
  );

  const built = {
    personContextPattern,
    dateOfBirthPattern,
    patientIdPattern,
    explicitNamePattern,
    labeledPhonePattern,
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
      type: 'phone',
      replacement: '$1 [PHONE]',
      pattern: localeRegex.labeledPhonePattern,
    },
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
      pattern: /\b(?:(?:[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+(?:\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+){0,2}\s+(?:katu|tie|kuja|polku|rinne|raitti|kaari|aukio|gatan|vägen|gränden|stigen|platsen))|(?:(?:[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+\s+){0,2}[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+(?:katu|tie|kuja|polku|rinne|raitti|kaari|aukio|gatan|vägen|gränden|stigen|platsen)))\s+\d{1,4}(?:\s?[-–]\s?\d{1,4})?(?:\s?[A-Za-zÅÄÖåäö])?(?:\s+(?:as|asunto|apt)\.?\s*\d{1,4})?(?:,?\s*\d{5}\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+)?\b/g,
    },
    {
      type: 'address',
      replacement: '$1 [ADDRESS]',
      pattern: /\b(asuu osoitteessa|postiosoite|osoite)\b\s*:?\s*(?!\[ADDRESS\])[^.\n]+/gi,
    },
    {
      type: 'address',
      replacement: '$1 [ADDRESS]',
      pattern: /\b(address|street address)\s*:?\s*(?!\[ADDRESS\])\d{1,5}\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+(?:\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+){0,2}\s+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Boulevard|Blvd|Way|Court|Ct)\b(?:,?\s*(?:Apt|Apartment|Suite|Ste)\.?\s*\w+)?/gi,
    },
    {
      type: 'address',
      replacement: '$1 [ADDRESS]',
      pattern: /(адрес)\s*:?\s*(?!\[ADDRESS\])(?:ул\.?|улица|проспект|пр-т|пер\.?|переулок|наб\.?|набережная|бул\.?|бульвар|шоссе)\s+[A-ZÅÄÖА-ЯЁ][A-Za-zÅÄÖåäöА-Яа-яЁё'’-]+(?:\s+[A-ZÅÄÖА-ЯЁ][A-Za-zÅÄÖåäöА-Яа-яЁё'’-]+){0,2}\s+\d{1,4}(?:\s*,?\s*(?:кв\.?|квартира)\s*\d{1,4})?\b/gi,
    },
    {
      type: 'address',
      replacement: '[ADDRESS]',
      pattern: /\bPL\s*\d{1,6}\s*,?\s*\d{5}\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+\b/g,
    },
    {
      type: 'address',
      replacement: '[ADDRESS]',
      pattern: /\b(?:ул\.?|улица|проспект|пр-т|пер\.?|переулок|наб\.?|набережная|бул\.?|бульвар|шоссе)\s+[A-ZÅÄÖА-ЯЁ][A-Za-zÅÄÖåäöА-Яа-яЁё'’-]+(?:\s+[A-ZÅÄÖА-ЯЁ][A-Za-zÅÄÖåäöА-Яа-яЁё'’-]+){0,2}\s+\d{1,4}(?:\s*,?\s*(?:кв\.?|квартира)\s*\d{1,4})?\b/gi,
    },
    {
      type: 'address',
      replacement: '[ADDRESS]',
      pattern: /\b\d{1,5}\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+(?:\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+){0,2}\s+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Boulevard|Blvd|Way|Court|Ct)\b(?:,?\s*(?:Apt|Apartment|Suite|Ste)\.?\s*\w+)?/g,
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

function isLikelyHumanNameToken(token: string) {
  const normalized = token.trim().replace(/^[^A-Za-zÅÄÖåäöА-Яа-яЁё]+|[^A-Za-zÅÄÖåäöА-Яа-яЁё'’-]+$/g, '');
  if (!normalized) return false;
  if (normalized.length < 2) return false;
  if (/\d/.test(normalized)) return false;
  if (CLINICAL_SECTION_HEADING_WORDS.has(normalized.toLocaleLowerCase('fi-FI'))) return false;

  const upperCount = (normalized.match(/[A-ZÅÄÖА-ЯЁ]/g) ?? []).length;
  return upperCount <= 1;
}

function isLikelyHumanName(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return false;
  if (isLikelyOrganizationOrTerm(normalized)) return false;

  const tokens = normalized.split(/[ \t,]+/).filter(Boolean);
  if (tokens.length === 0) return false;

  return tokens.every(isLikelyHumanNameToken);
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
      if (PRIVACY_PLACEHOLDER_PATTERN.test(value)) continue;
      if (rule.type === 'explicitName' && SUSPICIOUS_EXPLICIT_NAME_VALUE_PATTERN.test(value)) continue;
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
    const nameValue = nameMatch[0].trim();
    if (!isLikelyHumanName(nameValue)) continue;
    if (isLikelyOrganizationOrTerm(value)) continue;
    findings.push(createFinding('explicitName', value, 'Ammattilainen [NAME]', roleStart));
  }

  return findings;
}

function collectPatientRoleNames(text: string): InternalFinding[] {
  const findings: InternalFinding[] = [];
  const roleRegex = new RegExp(PATIENT_ROLE_PATTERN.source, PATIENT_ROLE_PATTERN.flags);
  const nameRegex = new RegExp(`^\\s+${SHORT_NAME_SEQUENCE}${UNICODE_LETTER_BOUNDARY_RIGHT}`, 'u');
  let match: RegExpExecArray | null;

  while ((match = roleRegex.exec(text)) !== null) {
    const roleStart = match.index;
    const roleEnd = roleStart + match[0].length;
    const afterRole = text.slice(roleEnd);
    const nameMatch = nameRegex.exec(afterRole);
    if (!nameMatch) continue;

    const nameValue = nameMatch[0].trim();
    if (!nameValue) continue;
    if (!isLikelyHumanName(nameValue)) continue;
    if (isLikelyOrganizationOrTerm(nameValue)) continue;

    findings.push(createFinding('explicitName', nameValue, '[NAME]', roleEnd + nameMatch[0].indexOf(nameValue)));
  }

  return findings;
}

function collectBareDatesNearIdentifiers(text: string, mode: AnonymizationMode, personContextPattern: RegExp): InternalFinding[] {
  const findings: InternalFinding[] = [];
  const regex = new RegExp(DATE_PATTERN.source, DATE_PATTERN.flags);
  const strictMode = isStrictContextMode(mode);
  const storageMode = isStorageLikeMode(mode);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;

    if (storageMode) {
      if (hasNearbyIdentifier(text, start, end, personContextPattern, true)) {
        findings.push(createFinding('dateOfBirth', value, '[DATE]', start));
      }
      continue;
    }

    if (hasNearbyBareDateOfBirthContext(text, start, end, strictMode)) {
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

    if (!isLikelyHumanName(value)) continue;
    if (isLikelyOrganizationOrTerm(value)) continue;
    if (!hasNearbyIdentifier(text, start, end, personContextPattern, strictMode)) continue;

    const [firstWord, ...remainingWords] = value.split(/\s+/);
    const isRelativeWord = remainingWords.length > 0 && RELATIVE_CONTEXT_WORD_PATTERN.test(firstWord);
    const isDemographicWord = remainingWords.length > 0 && DEMOGRAPHIC_CONTEXT_WORD_PATTERN.test(firstWord);
    const isStaffWord = remainingWords.length > 0 && STAFF_CONTEXT_WORD_PATTERN.test(firstWord);
    const isPatientRoleWord = remainingWords.length > 0 && PATIENT_ROLE_CONTEXT_WORD_PATTERN.test(firstWord);

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
      if (!isLikelyHumanName(nameValue)) continue;
      const nameStart = start + firstWord.length + value.slice(firstWord.length).search(/\S/);
      findings.push(createFinding('explicitName', nameValue, '[NAME]', nameStart));
      continue;
    }

    if (isPatientRoleWord) {
      const nameValue = remainingWords.join(' ');
      if (!isLikelyHumanName(nameValue)) continue;
      const nameStart = start + firstWord.length + value.slice(firstWord.length).search(/\S/);
      findings.push(createFinding('explicitName', nameValue, '[NAME]', nameStart));
      continue;
    }

    findings.push(createFinding('explicitName', value, '[NAME]', start));
  }

  return findings;
}

function collectCommaSeparatedNames(text: string, mode: AnonymizationMode, personContextPattern: RegExp): InternalFinding[] {
  const findings: InternalFinding[] = [];
  const regex = new RegExp(COMMA_NAME_PATTERN.source, COMMA_NAME_PATTERN.flags);
  const strictMode = isStrictContextMode(mode);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;

    if (!isLikelyHumanName(value)) continue;
    const nearby = text.slice(Math.max(0, start - 40), Math.min(text.length, end + 80));
    const hasStaffContext = STAFF_CONTEXT_HINT_PATTERN.test(nearby);

    if (!hasNearbyIdentifier(text, start, end, personContextPattern, strictMode) && !hasStaffContext) {
      continue;
    }

    const replacement = hasStaffContext ? 'Ammattilainen [NAME]' : '[NAME]';
    findings.push(createFinding('explicitName', value, replacement, start));
  }

  return findings;
}

function collectStrictDates(text: string, mode: AnonymizationMode): InternalFinding[] {
  if (!shouldRedactExactDates(mode)) return [];

  const findings: InternalFinding[] = [];
  const regex = new RegExp(DATE_PATTERN.source, DATE_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const start = match.index;
    findings.push(createFinding('dateOfBirth', value, '[DATE]', start));
  }

  return findings;
}

function collectStandaloneFullInputName(text: string, mode: AnonymizationMode): InternalFinding[] {
  const trimmed = text.trim();
  if (!trimmed || !STANDALONE_FULL_NAME_PATTERN.test(trimmed)) return [];
  if (!isLikelyHumanName(trimmed)) return [];
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
    ...collectPatientRoleNames(text),
    ...collectBareDatesNearIdentifiers(text, mode, localeRegex.personContextPattern),
    ...collectBareNamesNearIdentifiers(text, mode, localeRegex.personContextPattern),
    ...collectCommaSeparatedNames(text, mode, localeRegex.personContextPattern),
    ...collectStrictDates(text, mode),
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
