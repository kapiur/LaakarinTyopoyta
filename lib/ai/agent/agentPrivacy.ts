import { anonymizePatientText, mergeAnonymizationResults, type AnonymizationMode, type PatientTextAnonymizationResult } from '../../privacy/anonymizePatientText';

export type AgentPrivacyInputKind =
  | 'clinicalText'
  | 'profileSample'
  | 'storedInstruction'
  | 'templateSyntax'
  | 'general';

export type AgentPrivacyInput = {
  key: string;
  value?: string | null;
  kind?: AgentPrivacyInputKind;
};

export type AgentPrivacyResult = {
  sanitized: Record<string, string>;
  privacy: {
    anonymized: boolean;
    findingTypes: string[];
  };
};

function modeForKind(kind: AgentPrivacyInputKind): AnonymizationMode | null {
  if (kind === 'clinicalText') return 'chat';
  if (kind === 'profileSample') return 'profileSample';
  if (kind === 'storedInstruction') return 'storage';
  if (kind === 'general') return 'chat';

  // Template syntax is not anonymized because placeholders and showIf-like syntax must remain intact.
  return null;
}

export function sanitizeAgentInputs(inputs: AgentPrivacyInput[]): AgentPrivacyResult {
  const sanitized: Record<string, string> = {};
  const results: PatientTextAnonymizationResult[] = [];

  for (const input of inputs) {
    const value = input.value ?? '';
    const kind = input.kind ?? 'general';
    const mode = modeForKind(kind);

    if (!mode) {
      sanitized[input.key] = value;
      continue;
    }

    const result = anonymizePatientText(value, { mode });
    sanitized[input.key] = result.sanitizedText;
    results.push(result);
  }

  const merged = mergeAnonymizationResults(results);

  return {
    sanitized,
    privacy: {
      anonymized: merged.hasFindings,
      findingTypes: merged.findingTypes,
    },
  };
}
