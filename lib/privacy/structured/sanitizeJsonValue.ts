import {
  anonymizePatientText,
  mergeAnonymizationResults,
  type AnonymizationMode,
  type PatientTextAnonymizationResult,
} from '../anonymizePatientText';

type PathSegment = string | number;

type SanitizeJsonValueOptions = {
  defaultMode?: AnonymizationMode;
  modeForPath?: (path: PathSegment[], value: string) => AnonymizationMode | null | undefined;
};

type SanitizedJsonValueResult = {
  value: unknown;
  anonymization: PatientTextAnonymizationResult;
};

function mergedAsPatientTextResult(results: PatientTextAnonymizationResult[]): PatientTextAnonymizationResult {
  const merged = mergeAnonymizationResults(results);
  return {
    sanitizedText: '',
    findings: merged.findings,
    hasFindings: merged.hasFindings,
    findingTypes: merged.findingTypes,
  };
}

function sanitizeStringLeaf(
  value: string,
  path: PathSegment[],
  options: SanitizeJsonValueOptions,
): PatientTextAnonymizationResult {
  const mode = options.modeForPath?.(path, value) ?? options.defaultMode ?? 'chat';

  if (mode === null) {
    return {
      sanitizedText: value,
      findings: [],
      hasFindings: false,
      findingTypes: [],
    };
  }

  return anonymizePatientText(value, { mode });
}

function sanitizeRecursive(
  value: unknown,
  path: PathSegment[],
  options: SanitizeJsonValueOptions,
): SanitizedJsonValueResult {
  if (typeof value === 'string') {
    const anonymization = sanitizeStringLeaf(value, path, options);
    return { value: anonymization.sanitizedText, anonymization };
  }

  if (Array.isArray(value)) {
    const children = value.map((item, index) => sanitizeRecursive(item, [...path, index], options));
    return {
      value: children.map((child) => child.value),
      anonymization: mergedAsPatientTextResult(children.map((child) => child.anonymization)),
    };
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, childValue]) => [
      key,
      sanitizeRecursive(childValue, [...path, key], options),
    ] as const);

    return {
      value: Object.fromEntries(entries.map(([key, child]) => [key, child.value])),
      anonymization: mergedAsPatientTextResult(entries.map(([, child]) => child.anonymization)),
    };
  }

  return {
    value,
    anonymization: mergedAsPatientTextResult([]),
  };
}

export function sanitizeJsonValue(
  value: unknown,
  options: SanitizeJsonValueOptions = {},
): SanitizedJsonValueResult {
  return sanitizeRecursive(value, [], options);
}
