import type { PatientDataFindingType } from '../anonymizePatientText';
import type { PrivacyDecision, PrivacySeverity } from './types';

const CRITICAL_TYPES = new Set<PatientDataFindingType>([
  'hetu',
  'email',
  'phone',
  'patientId',
  'address',
]);

export function severityForResidualFindings(findingTypes: PatientDataFindingType[]): PrivacySeverity {
  if (findingTypes.length === 0) return 'none';
  if (findingTypes.some((type) => CRITICAL_TYPES.has(type))) return 'critical';
  return 'warning';
}

export function decisionForResidualFindings(findingTypes: PatientDataFindingType[]): PrivacyDecision {
  const severity = severityForResidualFindings(findingTypes);
  if (severity === 'critical') return 'block';
  if (severity === 'warning') return 'warn';
  return 'allow';
}
