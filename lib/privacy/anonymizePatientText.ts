export type PatientDataFindingType =
  | 'hetu'
  | 'email'
  | 'phone'
  | 'dateOfBirth'
  | 'patientId'
  | 'explicitName'
  | 'address';

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
const HETU_PATTERN = /\b\d{2}(?:0[1-9]|1[0-2])\d{2}[-+A]\d{3}[0-9A-Z]?\b/g;
const DATE_PATTERN = /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g;
const PHONE_PATTERN = /(?<!\d)(?:\+358|0)\s?(?:4\d|[1-9]\d?)\s?(?:\d\s?){5,8}(?!\d)/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PERSON_CONTEXT_PATTERN = /\b(?:potilas|nimi|name|syntynyt|synt\.|s\.|dob|henkilötunnus|hetu|vaimo|puoliso|aviopuoliso|mies|nainen|tyttö|poika|lapsi|äiti|isä|tytär|veli|sisko|sisar|omainen|lähiomainen|huoltaja)\b/i;
const RELATIVE_CONTEXT_WORD_PATTERN = /^(?:vaimo|puoliso|aviopuoliso|äiti|isä|tytär|veli|sisko|sisar|omainen|lähiomainen|huoltaja)$/i;
const DEMOGRAPHIC_CONTEXT_WORD_PATTERN = /^(?:mies|nainen|tyttö|poika|lapsi)$/i;
const NAME_TOKEN = "[A-ZÅÄÖI][A-Za-zÅÄÖåäö'’-]+";
const BARE_NAME_PATTERN = new RegExp(`\\b${NAME_TOKEN}(?:\\s+${NAME_TOKEN})+\\b`, 'g');

const NON_PERSON_NAME_PATTERNS = [
  /\bKeski\s+Uudenmaan\b/i,
  /\bKeski\s+Uusimaa\b/i,
  /\bHyvinkään\s+Sairaala\b/i,
  /\bHyvinkään\s+Sairaalassa\b/i,
  /\bMäntsälän\s+Terveyskeskus\b/i,
  /\bNurmijärven\s+Terveyskeskus\b/i,
  /\bKäypä\s+Hoito\b/i,
  /\bHUS\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+\b/,
  /\bKeusote\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+\b/,
];

const PATTERN_RULES: PatternRule[] = [
  {
    type: 'hetu',
    replacement: '[HETU]',
    pattern: HETU_PATTERN,
  },
  {
    type: 'email',
    replacement: '[EMAIL]',
    pattern: EMAIL_PATTERN,
  },
  {
    type: 'phone',
    replacement: '[PHONE]',
    pattern: PHONE_PATTERN,
  },
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
    pattern: /\b[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+(?:katu|tie|kuja|polku|rinne|raitti|kaari|aukio)\s+\d{1,4}\s?[A-Za-z]?\b/g,
  },
];

function createFinding(type: PatientDataFindingType, value: string, replacement: string, start: number): InternalFinding {
  return {
    type,
    value,
    replacement,
    start,
    end: start + value.length,
  };
}

function regexMatches(pattern: RegExp, value: string) {
  return new RegExp(pattern.source, pattern.flags.replace('g', '')).test(value);
}

function isLikelyOrganizationOrTerm(value: string) {
  return NON_PERSON_NAME_PATTERNS.some((pattern) => pattern.test(value));
}

function hasNearbyIdentifier(text: string, start: number, end: number) {
  const windowStart = Math.max(0, start - CONTEXT_WINDOW_CHARS);
  const windowEnd = Math.min(text.length, end + CONTEXT_WINDOW_CHARS);
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

function collectBareDatesNearIdentifiers(text: string): InternalFinding[] {
  const findings: InternalFinding[] = [];
  const regex = new RegExp(DATE_PATTERN.source, DATE_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;

    if (hasNearbyIdentifier(text, start, end)) {
      findings.push(createFinding('dateOfBirth', value, '[DATE_OF_BIRTH]', start));
    }
  }

  return findings;
}

function collectBareNamesNearIdentifiers(text: string): InternalFinding[] {
  const findings: InternalFinding[] = [];
  const regex = new RegExp(BARE_NAME_PATTERN.source, BARE_NAME_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;

    if (isLikelyOrganizationOrTerm(value)) continue;
    if (!hasNearbyIdentifier(text, start, end)) continue;

    const [firstWord, ...remainingWords] = value.split(/\s+/);
    const isRelativeWord = remainingWords.length > 0 && RELATIVE_CONTEXT_WORD_PATTERN.test(firstWord);
    const isDemographicWord = remainingWords.length > 0 && DEMOGRAPHIC_CONTEXT_WORD_PATTERN.test(firstWord);

    if (isRelativeWord) {
      findings.push(createFinding('explicitName', value, 'omainen [NAME]', start));
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

function collectMatches(text: string): InternalFinding[] {
  const findings = [
    ...collectPatternMatches(text),
    ...collectBareDatesNearIdentifiers(text),
    ...collectBareNamesNearIdentifiers(text),
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

export function anonymizePatientText(input: unknown): PatientTextAnonymizationResult {
  const original = typeof input === 'string' ? input : '';
  const findings = removeOverlaps(collectMatches(original));

  if (findings.length === 0) {
    return {
      sanitizedText: original,
      findings: [],
      hasFindings: false,
      findingTypes: [],
    };
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

  return {
    sanitizedText,
    findings: publicFindings,
    hasFindings: true,
    findingTypes,
  };
}

export function mergeAnonymizationResults(results: PatientTextAnonymizationResult[]) {
  const findings = results.flatMap((result) => result.findings);
  const findingTypes = Array.from(new Set(results.flatMap((result) => result.findingTypes)));

  return {
    hasFindings: findings.length > 0,
    findings,
    findingTypes,
  };
}
