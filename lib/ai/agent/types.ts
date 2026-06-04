import type { AiTaskType } from '../taskTypes';

export type AgentContextType = 'general' | 'malli' | 'aiTool' | 'clinicalText' | 'pikaohje';
export type AgentUiLanguage = 'fi' | 'ru' | 'en';

export type AgentSuggestedAction =
  | { type: 'copy_draft'; label: string }
  | { type: 'use_as_template_draft'; label: string }
  | { type: 'open_template_editor'; label: string }
  | { type: 'use_as_ai_tool_prompt'; label: string }
  | { type: 'use_as_pikaohje_draft'; label: string }
  | { type: 'review_again'; label: string };

export type AgentConversationTurn = {
  userMessage: string;
  assistantReply: string;
  assistantDraft?: string;
  taskType?: string;
};

export type AgentConversationContext = {
  previousTurns?: AgentConversationTurn[];
  latestDraft?: string;
};

export type AgentRequestBody = {
  contextType?: AgentContextType;
  uiLanguage?: AgentUiLanguage;
  userMessage?: string;
  currentText?: string;
  currentTemplate?: string;
  selectedTemplateId?: number | string;
  selectedToolId?: number | string;
  selectedCardId?: number | string;
  conversationId?: string;
  conversationContext?: AgentConversationContext;
};

export type AgentPlan = {
  taskType: AiTaskType;
  systemInstruction: string;
  userInstruction: string;
  suggestedActions: AgentSuggestedAction[];
};
