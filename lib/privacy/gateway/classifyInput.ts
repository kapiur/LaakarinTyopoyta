import type { AnonymizationMode } from '../anonymizePatientText';
import type { PrivacyGatewayMode } from './types';

export function primaryModeForGatewayMode(mode: PrivacyGatewayMode): AnonymizationMode | null {
  if (mode === 'persistentStorage') return 'strictStorage';
  if (mode === 'persistentSample') return 'persistentSample';
  if (mode === 'clinicalTransform') return 'clinicalTransform';
  if (mode === 'clinicalBuilder') return 'clinicalBuilder';
  if (mode === 'transientClinicalChat') return 'transientClinicalChat';
  if (mode === 'generalText') return 'generalText';
  if (mode === 'templateSyntax') return null;
  return 'generalText';
}

export function residualModeForGatewayMode(mode: PrivacyGatewayMode): AnonymizationMode | null {
  if (mode === 'persistentStorage' || mode === 'persistentSample') return 'strictStorage';
  if (mode === 'clinicalBuilder') return 'strictStorage';
  if (mode === 'clinicalTransform') return 'transientClinicalChat';
  if (mode === 'templateSyntax') return null;
  return 'transientClinicalChat';
}
