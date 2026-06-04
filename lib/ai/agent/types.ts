import type { AiTaskType } from '../taskTypes';

export type AgentContextType = 'general' | 'malli' | 'aiTool' | 'clinicalText' | 'pikaohje';

export type AgentSuggestedAction =
  | { type: 'copy_draft'; label: string }
  | { type: 'use_as_template_draft'; label: string }
  | { type: 'open_template_editor'; label: string }
  | { type: 'use_as_ai_tool_prompt'; label: string }
  | { type: 'use_as_pikaohje_draft'; label: string }
  | { type: 'review_again'; label: string };

export type AgentRequestBody = {
  contextType?: AgentContextType;
  userMessage?: string;
  currentText?: string;
  currentTemplate?: string;
  selectedTemplateId?: number | string;
  selectedToolId?: number | string;
  selectedCardId?: number | string;
  conversationId?: string;
};

export type AgentPlan = {
  taskType: AiTaskType;
  systemInstruction: string;
  userInstruction: string;
  suggestedActions: AgentSuggestedAction[];
};
