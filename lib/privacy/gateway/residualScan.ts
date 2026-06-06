import { anonymizePatientText, mergeAnonymizationResults } from '../anonymizePatientText';
import type { PrivacyPreparedField } from './types';

export function scanResidualPrivacyRisk(fields: PrivacyPreparedField[]) {
  const residualResults = fields
    .filter((field) => field.residualMode)
    .map((field) => anonymizePatientText(field.sanitizedValue, { mode: field.residualMode!, localeKeys: field.localeKeys }));

  const merged = mergeAnonymizationResults(residualResults);

  return {
    findings: merged.findings,
    findingTypes: merged.findingTypes,
    hasFindings: merged.hasFindings,
  };
}
