import type { AiTaskType } from '../taskTypes';

export type AgentContextType = string;
export type AgentUiLanguage = 'fi' | 'ru' | 'en';
export type AgentSuggestedAction = { type: string; label: string };

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
