export type AiTaskType =
  | 'clinical_document'
  | 'clinical_review'
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

export function normalizeAiTaskType(value: unknown): AiTaskType {
  if (
    value === 'clinical_document' ||
    value === 'clinical_review' ||
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
