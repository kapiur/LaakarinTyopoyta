import { anonymizePatientText, mergeAnonymizationResults } from '../anonymizePatientText';
import { DEFAULT_PRIVACY_LOCALE_KEYS } from '../packs';
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
    const localeKeys = input.localeKeys && input.localeKeys.length > 0 ? input.localeKeys : DEFAULT_PRIVACY_LOCALE_KEYS;
    const primaryMode = primaryModeForGatewayMode(gatewayMode);
    const residualMode = residualModeForGatewayMode(gatewayMode);
    const primaryResult = primaryMode ? anonymizePatientText(originalValue, { mode: primaryMode, localeKeys }) : undefined;
    const sanitizedValue = primaryResult ? primaryResult.sanitizedText : originalValue;

    sanitized[input.key] = sanitizedValue;
    fields.push({
      key: input.key,
      originalValue,
      sanitizedValue,
      gatewayMode,
      localeKeys,
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
