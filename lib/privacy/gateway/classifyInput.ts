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
  // Clinical text transformation already goes through primary sanitization.
  // A second residual gate on top of long clinical notes creates too many
  // false-positive hard blocks for ordinary care documentation.
  if (mode === 'clinicalTransform') return null;
  if (mode === 'templateSyntax') return null;
  return 'transientClinicalChat';
}
