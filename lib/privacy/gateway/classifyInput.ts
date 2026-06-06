import type { AnonymizationMode } from '../anonymizePatientText';
import type { PrivacyGatewayMode } from './types';

export function primaryModeForGatewayMode(mode: PrivacyGatewayMode): AnonymizationMode | null {
  if (mode === 'persistentStorage') return 'storage';
  if (mode === 'persistentSample') return 'profileSample';
  if (mode === 'templateSyntax') return null;
  return 'chat';
}

export function residualModeForGatewayMode(mode: PrivacyGatewayMode): AnonymizationMode | null {
  if (mode === 'persistentStorage' || mode === 'persistentSample') return 'storage';
  if (mode === 'templateSyntax') return null;
  return 'chat';
}
