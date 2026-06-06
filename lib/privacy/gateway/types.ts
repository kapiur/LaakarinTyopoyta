import type {
  AnonymizationMode,
  PatientDataFindingType,
  PatientTextAnonymizationResult,
} from '../anonymizePatientText';
import type { PrivacyLocaleKey } from '../packs';

export type PrivacyGatewayMode =
  | 'transientClinicalChat'
  | 'generalText'
  | 'clinicalTransform'
  | 'clinicalBuilder'
  | 'persistentStorage'
  | 'persistentSample'
  | 'templateSyntax';

export type PrivacyGatewayInput = {
  key: string;
  value?: string | null;
  mode?: PrivacyGatewayMode;
  localeKeys?: PrivacyLocaleKey[];
};

export type PrivacyDecision = 'allow' | 'warn' | 'block';
export type PrivacySeverity = 'none' | 'warning' | 'critical';

export type PrivacyPreparedField = {
  key: string;
  originalValue: string;
  sanitizedValue: string;
  gatewayMode: PrivacyGatewayMode;
  localeKeys: PrivacyLocaleKey[];
  primaryMode: AnonymizationMode | null;
  residualMode: AnonymizationMode | null;
  primaryResult?: PatientTextAnonymizationResult;
};

export type PrivacyGatewayResult = {
  sanitized: Record<string, string>;
  fields: PrivacyPreparedField[];
  privacy: {
    anonymized: boolean;
    findingTypes: PatientDataFindingType[];
    residualFindingTypes: PatientDataFindingType[];
    decision: PrivacyDecision;
    severity: PrivacySeverity;
    blocked: boolean;
    localeKeys: PrivacyLocaleKey[];
  };
};
