export type AiTaskType =
  | 'clinical_document'
  | 'clinical_review'
  | 'clinical_advice'
  | 'clinical_reference'
  | 'clinical_guideline_comparison'
  | 'clinical_source_check'
  | 'pikaohje_generation'
  | 'pikaohje_review'
  | 'medication_guidance'
  | 'urgent_triage'
  | 'referral_guidance'
  | 'text_fix'
  | 'translation'
  | 'template_generation'
  | 'template_polish'
  | 'tool_design'
  | 'lab_format'
  | 'general_chat';

export type AiTaskContext = {
  taskType: AiTaskType;
  requiresHighQuality?: boolean;
  requiresStrictFormatting?: boolean;
  prefersFastModel?: boolean;
};

export type AiTaskPolicy = {
  requiresEvidence: boolean;
  allowEvidenceOptional?: boolean;
  requiresOfficialSource?: boolean;
  allowsRegistryOnlyReference?: boolean;
  safetyLevel: 'none' | 'low' | 'clinical' | 'high';
};

export const AI_TASK_POLICY: Record<AiTaskType, AiTaskPolicy> = {
  clinical_document: {
    requiresEvidence: false,
    allowEvidenceOptional: true,
    requiresOfficialSource: false,
    safetyLevel: 'clinical',
  },
  clinical_review: {
    requiresEvidence: true,
    requiresOfficialSource: true,
    safetyLevel: 'clinical',
  },
  clinical_advice: {
    requiresEvidence: true,
    requiresOfficialSource: true,
    safetyLevel: 'high',
  },
  clinical_reference: {
    requiresEvidence: false,
    allowEvidenceOptional: true,
    requiresOfficialSource: true,
    allowsRegistryOnlyReference: true,
    safetyLevel: 'clinical',
  },
  clinical_guideline_comparison: {
    requiresEvidence: false,
    allowEvidenceOptional: true,
    requiresOfficialSource: true,
    allowsRegistryOnlyReference: true,
    safetyLevel: 'clinical',
  },
  clinical_source_check: {
    requiresEvidence: false,
    allowEvidenceOptional: true,
    requiresOfficialSource: true,
    allowsRegistryOnlyReference: true,
    safetyLevel: 'clinical',
  },
  pikaohje_generation: {
    requiresEvidence: true,
    requiresOfficialSource: true,
    safetyLevel: 'clinical',
  },
  pikaohje_review: {
    requiresEvidence: true,
    requiresOfficialSource: true,
    safetyLevel: 'clinical',
  },
  medication_guidance: {
    requiresEvidence: true,
    requiresOfficialSource: true,
    safetyLevel: 'high',
  },
  urgent_triage: {
    requiresEvidence: true,
    requiresOfficialSource: true,
    safetyLevel: 'high',
  },
  referral_guidance: {
    requiresEvidence: true,
    requiresOfficialSource: true,
    safetyLevel: 'clinical',
  },
  text_fix: {
    requiresEvidence: false,
    safetyLevel: 'low',
  },
  translation: {
    requiresEvidence: false,
    safetyLevel: 'low',
  },
  template_generation: {
    requiresEvidence: false,
    safetyLevel: 'low',
  },
  template_polish: {
    requiresEvidence: false,
    safetyLevel: 'low',
  },
  tool_design: {
    requiresEvidence: false,
    safetyLevel: 'low',
  },
  lab_format: {
    requiresEvidence: false,
    safetyLevel: 'none',
  },
  general_chat: {
    requiresEvidence: false,
    safetyLevel: 'low',
  },
};

export function getAiTaskPolicy(taskType: AiTaskType): AiTaskPolicy {
  return AI_TASK_POLICY[taskType] ?? AI_TASK_POLICY.general_chat;
}

export function taskRequiresEvidence(taskType: AiTaskType) {
  return getAiTaskPolicy(taskType).requiresEvidence === true;
}

export function taskAllowsRegistryOnlyReference(taskType: AiTaskType) {
  return getAiTaskPolicy(taskType).allowsRegistryOnlyReference === true;
}

export function normalizeAiTaskType(value: unknown): AiTaskType {
  if (
    value === 'clinical_document' ||
    value === 'clinical_review' ||
    value === 'clinical_advice' ||
    value === 'clinical_reference' ||
    value === 'clinical_guideline_comparison' ||
    value === 'clinical_source_check' ||
    value === 'pikaohje_generation' ||
    value === 'pikaohje_review' ||
    value === 'medication_guidance' ||
    value === 'urgent_triage' ||
    value === 'referral_guidance' ||
    value === 'text_fix' ||
    value === 'translation' ||
    value === 'template_generation' ||
    value === 'template_polish' ||
    value === 'tool_design' ||
    value === 'lab_format' ||
    value === 'general_chat'
  ) {
    return value;
  }

  return 'general_chat';
}
