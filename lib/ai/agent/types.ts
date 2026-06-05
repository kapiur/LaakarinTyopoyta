import type { AiTaskType } from '../taskTypes';

export type AgentContextType = 'general' | 'clinicalReference' | 'malli' | 'aiTool' | 'clinicalText' | 'pikaohje';
export type AgentUiLanguage = 'fi' | 'ru' | 'en';

export type AgentSuggestedAction = { type: string; label: string };

export type AgentConversationTurn = {
  userMessage: string;
  assistantReply: string;
  assistantDraft?: string;
  taskType?: string;
};

export type AgentConversationContext