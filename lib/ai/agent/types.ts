import type { AiTaskType } from '../taskTypes';
import type { UiLanguage } from '../../i18n/config';

export type AgentContextType =
  | 'general'
  | 'clinicalReference'
  | 'clinicalResearch'
  | 'malli'
  | 'aiTool'
  | 'clinicalText'
  | 'pikaohje';
export type AgentUiLanguage = UiLanguage;

export type AgentSuggestedAction =
  | { type: 'copy_draft' }
  | { type: 'use_as_template_draft' }
  | { type: 'open_template_editor' }
  | { type: 'use_as_ai_tool_prompt' }
  | { type: 'use_as_pikaohje_draft' }
  | { type: 'review_again' };

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
  researchCountries?: string[];
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
