import { anonymizePatientText, mergeAnonymizationResults } from '../anonymizePatientText';
import { primaryModeForGatewayMode, residualModeForGatewayMode } from './classifyInput';
import type { PrivacyGatewayInput, PrivacyPreparedField } from './types';

export function sanitizePrivacyPayload(inputs: PrivacyGatewayInput[]): {
  sanitized: Record<string, string>;
  fields: PrivacyPreparedField[];
  findingTypes: ReturnType<typeof mergeAnonymizationResults>['findingTypes'];
  anonymized: boolean;
} {
  const sanitized: Record<string, string> = {};
  const fields: PrivacyPreparedField[] = [];

  for (const input of inputs) {
    const originalValue = typeof input.value === 'string' ? input.value : '';
    const gatewayMode = input.mode ?? 'generalText';
    const primaryMode = primaryModeForGatewayMode(gatewayMode);
    const residualMode = residualModeForGatewayMode(gatewayMode);
    const primaryResult = primaryMode ? anonymizePatientText(originalValue, { mode: primaryMode }) : undefined;
    const sanitizedValue = primaryResult ? primaryResult.sanitizedText : originalValue;

    sanitized[input.key] = sanitizedValue;
    fields.push({
      key: input.key,
      originalValue,
      sanitizedValue,
      gatewayMode,
      primaryMode,
      residualMode,
      primaryResult,
    });
  }

  const merged = mergeAnonymizationResults(
    fields
      .map((field) => field.primaryResult)
      .filter((result): result is NonNullable<typeof result> => Boolean(result)),
  );

  return {
    sanitized,
    fields,
    findingTypes: merged.findingTypes,
    anonymized: merged.hasFindings,
  };
}
