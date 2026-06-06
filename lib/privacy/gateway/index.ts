import { decisionForResidualFindings, severityForResidualFindings } from './decision';
import { scanResidualPrivacyRisk } from './residualScan';
import { sanitizePrivacyPayload } from './sanitizePayload';
import type { PrivacyGatewayInput, PrivacyGatewayResult } from './types';

export * from './types';

export function preparePrivacyPayload(inputs: PrivacyGatewayInput[]): PrivacyGatewayResult {
  const sanitizedPayload = sanitizePrivacyPayload(inputs);
  const residual = scanResidualPrivacyRisk(sanitizedPayload.fields);
  const decision = decisionForResidualFindings(residual.findingTypes);
  const severity = severityForResidualFindings(residual.findingTypes);
  const localeKeys = Array.from(new Set(sanitizedPayload.fields.flatMap((field) => field.localeKeys)));

  return {
    sanitized: sanitizedPayload.sanitized,
    fields: sanitizedPayload.fields,
    privacy: {
      anonymized: sanitizedPayload.anonymized,
      findingTypes: sanitizedPayload.findingTypes,
      residualFindingTypes: residual.findingTypes,
      decision,
      severity,
      blocked: decision === 'block',
      localeKeys,
    },
  };
}
