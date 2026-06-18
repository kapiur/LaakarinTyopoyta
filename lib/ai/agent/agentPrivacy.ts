import { preparePrivacyPayload, type PrivacyGatewayMode } from '../../privacy/gateway';

export type AgentPrivacyInputKind =
  | 'clinicalText'
  | 'profileSample'
  | 'storedInstruction'
  | 'publicSourceText'
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
    residualFindingTypes: string[];
    decision: 'allow' | 'warn' | 'block';
    severity: 'none' | 'warning' | 'critical';
    blocked: boolean;
  };
};

function modeForKind(kind: AgentPrivacyInputKind): PrivacyGatewayMode {
  if (kind === 'clinicalText') return 'clinicalTransform';
  if (kind === 'profileSample') return 'persistentSample';
  if (kind === 'storedInstruction') return 'persistentStorage';
  if (kind === 'publicSourceText') return 'templateSyntax';
  if (kind === 'templateSyntax') return 'templateSyntax';
  return 'generalText';
}

export function sanitizeAgentInputs(inputs: AgentPrivacyInput[]): AgentPrivacyResult {
  const gatewayResult = preparePrivacyPayload(
    inputs.map((input) => ({
      key: input.key,
      value: input.value ?? '',
      mode: modeForKind(input.kind ?? 'general'),
    })),
  );

  return {
    sanitized: gatewayResult.sanitized,
    privacy: {
      anonymized: gatewayResult.privacy.anonymized,
      findingTypes: gatewayResult.privacy.findingTypes,
      residualFindingTypes: gatewayResult.privacy.residualFindingTypes,
      decision: gatewayResult.privacy.decision,
      severity: gatewayResult.privacy.severity,
      blocked: gatewayResult.privacy.blocked,
    },
  };
}
