export type AiTaskType = 'clinical_document' | 'clinical_review' | 'clinical_advice' | 'clinical_reference' | 'clinical_guideline_comparison' | 'clinical_source_check' | 'pikaohje_generation' | 'pikaohje_review' | 'medication_guidance' | 'urgent_triage' | 'referral_guidance' | 'text_fix' | 'translation' | 'template_generation' | 'template_polish' | 'tool_design' | 'lab_format' | 'general_chat';

export function taskRequiresEvidence(taskType: AiTaskType): boolean {
  return taskType === 'clinical_advice' || taskType === 'pikaohje_generation' || taskType === 'pikaohje_review' || taskType === 'medication_guidance' || taskType === 'urgent_triage' || taskType === 'referral_guidance';
}

export function taskAllowsRegistryOnlyReference(taskType: AiTaskType): boolean {
  return taskType === 'clinical_reference' || taskType === 'clinical_guideline_comparison' || taskType === 'clinical_source_check';
}
