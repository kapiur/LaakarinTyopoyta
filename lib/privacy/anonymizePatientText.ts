export type PatientDataFindingType =
  | 'hetu'
  | 'email'
  | 'phone'
  | 'dateOfBirth'
  | 'patientId'
  | 'explicitName'
  | 'address';

export type AnonymizationMode = 'chat' | 'profileSample' | 'storage';

export type AnonymizationOptions = {
  mode?: AnonymizationMode;
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

const CONTEXT_WINDOW_CHARS = 120;
const STRICT_CONTEXT_WINDOW_CHARS = 180;

const HETU_PATTERN = /\b\d{2}(?:0[1-9]|1[0-2])\d{2}(?:[+\-A-FU-Y])\d{3}[0-9A-Z]\b/g;
const DATE_PATTERN = /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g;
const PHONE_PATTERN = /(?<!\d)(?:\+358|0)\s?(?:4\d|[1-9]\d?)\s?(?:\d\s?){5,8}(?!\d)/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const STAFF_CONTEXT_WORDS = 'lääkäri|laakari|hoitaja|sairaanhoitaja|terveydenhoitaja|lähihoitaja|lahihoitaja|fysioterapeutti|fysioterapeuti|toimintaterapeutti|puheterapeutti|psykologi|psykiatri|sosiaalityöntekijä|sosiaalityontekija|ravitsemusterapeutti|farmaseutti|proviisori|hammaslääkäri|hammaslaakari|suuhygienisti|kätilö|katilo|ensihoitaja|laboratoriohoitaja|röntgenhoitaja|rontgenhoitaja|ammattilainen|ammattihenkilö|ammattihenkilo';
const PERSON_CONTEXT_PATTERN = new RegExp(`\\b(?:potilas|nimi|name|syntynyt|synt\\.|s\\.|dob|henkilötunnus|hetu|vaimo|puoliso|aviopuoliso|mies|nainen|tyttö|poika|lapsi|äiti|isä|tytär|veli|sisko|sisar|omainen|lähiomainen|huoltaja|${STAFF_CONTEXT_WORDS})\\b`, 'i');
const RELATIVE_CONTEXT_WORD_PATTERN = /^(?:vaimo|puoliso|aviopuoliso|äiti|isä|tytär|veli|sisko|sisar|omainen|lähiomainen|huoltaja)$/i;
const DEMOGRAPHIC_CONTEXT_WORD_PATTERN = /^(?:mies|nainen|tyttö|poika|lapsi)$/i;
const STAFF_CONTEXT_WORD_PATTERN = new RegExp(`^(?:${STAFF_CONTEXT_WORDS})$`, 'i');
const STAFF_ROLE_PATTERN = new RegExp(`\\b(?:${STAFF_CONTEXT_WORDS})\\b`, 'gi');
const NAME_TOKEN = "[A-ZÅÄÖI][A-Za-zÅÄÖåäö'’-]+";
const NAME_SEQUENCE = `${NAME_TOKEN}(?:\\s+${NAME_TOKEN}){1,3}`;
const NAME_AFTER_ROLE_PATTERN = new RegExp(`^\\s+${NAME_SEQUENCE}\\b`);
const BARE_NAME_PATTERN = new RegExp(`\\b${NAME_TOKEN}(?:\\s+${NAME_TOKEN})+\\b`, 'g');

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

const PATTERN_RULES: PatternRule[] = [
  { type: 'hetu', replacement: '[HETU]', pattern: HETU_PATTERN },
  { type: 'email', replacement: '[EMAIL]', pattern: EMAIL_PATTERN },
  { type: 'phone', replacement: '[PHONE]', pattern: PHONE_PATTERN },
  {
    type: 'dateOfBirth',
    replacement: '$1 [DATE_OF_BIRTH]',
    pattern: /\b(syntynyt|synt\.|s\.|dob|date of birth|birth date|syntymäaika)\s*:?\s*\d{1,2}\.\d{1,2}\.\d{2,4}\b/gi,
  },
  {
    type: 'patientId',
    replacement: '$1 [PATIENT_ID]',
    pattern: /\b(potilasnumero|potilasnro|henkilönumero|henkilönro|asiakasnumero|asiakasnro|patient id)\s*:?\s*[A-Z0-9-]{4,}\b/gi,
  },
  {
    type: 'explicitName',
    replacement: '$1 [NAME]',
    pattern: /\b(potilas|nimi|name)\s*:?\s*[A-ZÅÄÖI][A-Za-zÅÄÖåäö'’-]+(?:\s+[A-ZÅÄÖI][A-Za-zÅÄÖåäö'’-]+)+\b/g,
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

function createFinding(type: PatientDataFindingType, value: string, replacement: string, start: number): InternalFinding {
  return { type, value, replacement, start, end: start + value.length };
}

function regexMatches(pattern: RegExp, value: string) {
  return new RegExp(pattern.source, pattern.flags.replace('g', '')).test(value);
}

function isLikelyOrganizationOrTerm(value: string) {
  return NON_PERSON_NAME_PATTERNS.some((pattern) => pattern.test(value));
}

function hasNearbyIdentifier(text: string, start: number, end: number, strict = false) {
  const windowSize = strict ? STRICT_CONTEXT_WINDOW_CHARS : CONTEXT_WINDOW_CHARS;
  const windowStart = Math.max(0, start - windowSize);
  const windowEnd = Math.min(text.length, end + windowSize);
  const nearby = text.slice(windowStart, windowEnd);

  return (
    regexMatches(HETU_PATTERN, nearby) ||
    regexMatches(PHONE_PATTERN, nearby) ||
    regexMatches(EMAIL_PATTERN, nearby) ||
    regexMatches(DATE_PATTERN, nearby) ||
    PERSON_CONTEXT_PATTERN.test(nearby)
  );
}

function collectPatternMatches(text: string): InternalFinding[] {
  const findings: InternalFinding[] = [];

  for (const rule of PATTERN_RULES) {
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

function collectBareDatesNearIdentifiers(text: string, mode: AnonymizationMode): InternalFinding[] {
  const findings: InternalFinding[] = [];
  const regex = new RegExp(DATE_PATTERN.source, DATE_PATTERN.flags);
  const strictMode = mode === 'profileSample' || mode === 'storage';
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;

    if (hasNearbyIdentifier(text, start, end, strictMode)) {
      findings.push(createFinding('dateOfBirth', value, strictMode ? '[DATE]' : '[DATE_OF_BIRTH]', start));
    }
  }

  return findings;
}

function collectBareNamesNearIdentifiers(text: string, mode: AnonymizationMode): InternalFinding[] {
  const findings: InternalFinding[] = [];
  const regex = new RegExp(BARE_NAME_PATTERN.source, BARE_NAME_PATTERN.flags);
  const strictMode = mode === 'profileSample' || mode === 'storage';
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;

    if (isLikelyOrganizationOrTerm(value)) continue;
    if (!hasNearbyIdentifier(text, start, end, strictMode)) continue;

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

function collectStrictDates(text: string, mode: AnonymizationMode): InternalFinding[] {
  if (mode === 'chat') return [];

  const findings: InternalFinding[] = [];
  const regex = new RegExp(DATE_PATTERN.source, DATE_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;

    if (hasNearbyIdentifier(text, start, end, true) || mode === 'storage') {
      findings.push(createFinding('dateOfBirth', value, '[DATE]', start));
    }
  }

  return findings;
}

function collectMatches(text: string, mode: AnonymizationMode): InternalFinding[] {
  const findings = [
    ...collectPatternMatches(text),
    ...collectStaffNames(text),
    ...collectBareDatesNearIdentifiers(text, mode),
    ...collectBareNamesNearIdentifiers(text, mode),
    ...collectStrictDates(text, mode),
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
  const findings = removeOverlaps(collectMatches(original, mode));

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
