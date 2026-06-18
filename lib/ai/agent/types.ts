import type { AiTaskType } from '../taskTypes';
import type { UiLanguage } from '../../i18n/config';

export type AgentContextType =
  | 'general'
  | 'clinicalReference'
  | 'malli'
  | 'aiTool'
  | 'clinicalText'
  | 'pikaohje';
export type AgentUiLanguage = UiLanguage;

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
  currentTextKind?: 'clinicalText' | 'profileSample' | 'storedInstruction' | 'publicSourceText' | 'templateSyntax' | 'general';
  currentTemplate?: string;
  currentTemplateKind?: 'clinicalText' | 'profileSample' | 'storedInstruction' | 'publicSourceText' | 'templateSyntax' | 'general';
  selectedTemplateId?: number | string;
  selectedToolId?: number | string;
  selectedCardId?: number | string;
  conversationId?: string;
  conversationContext?: AgentConversationContext;
  conversationContextKind?: 'clinicalText' | 'profileSample' | 'storedInstruction' | 'publicSourceText' | 'templateSyntax' | 'general';
};

export type AgentPlan = {
  taskType: AiTaskType;
  systemInstruction: string;
  userInstruction: string;
  suggestedActions: AgentSuggestedAction[];
};
