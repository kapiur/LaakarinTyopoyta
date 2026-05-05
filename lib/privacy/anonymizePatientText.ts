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

const PATTERN_RULES: PatternRule[] = [
  {
    type: 'hetu',
    replacement: '[HETU]',
    pattern: /\b\d{2}(?:0[1-9]|1[0-2])\d{2}[-+A]\d{3}[0-9A-Z]\b/g,
  },
  {
    type: 'email',
    replacement: '[EMAIL]',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    type: 'phone',
    replacement: '[PHONE]',
    pattern: /(?<!\d)(?:\+358|0)\s?(?:4\d|[1-9]\d?)\s?(?:\d\s?){5,8}(?!\d)/g,
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
    pattern: /\b(potilas|nimi|name)\s*:?\s*[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+(?:\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+){1,3}\b/g,
  },
  {
    type: 'address',
    replacement: '[ADDRESS]',
    pattern: /\b[A-ZÅÄÖ][A-Za-zÅÄÖåäö'’-]+(?:katu|tie|kuja|polku|rinne|raitti|kaari|aukio)\s+\d{1,4}\s?[A-Za-z]?\b/g,
  },
];

function collectMatches(text: string): InternalFinding[] {
  const findings: InternalFinding[] = [];

  for (const rule of PATTERN_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;

      if (!value.trim()) continue;

      const replacement = value.replace(rule.pattern, rule.replacement);
      findings.push({
        type: rule.type,
        value,
        replacement,
        start,
        end,
      });
    }
  }

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
