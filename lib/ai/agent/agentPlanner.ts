import type { AgentContextType, AgentPlan, AgentSuggestedAction } from './types';
import type { AiTaskType } from '../taskTypes';

function inferTaskType(contextType: AgentContextType, userMessage: string): AiTaskType {
  const text = userMessage.toLowerCase();

  if (contextType === 'malli') {
    if (text.includes('korjaa') || text.includes('paranna') || text.includes('muokkaa') || text.includes('улуч') || text.includes('исправ')) return 'template_polish';
    return 'template_generation';
  }

  if (contextType === 'aiTool') return 'tool_design';

  if (contextType === 'clinicalText') {
    if (text.includes('tarkista') || text.includes('проверь') || text.includes('arvioi') || text.includes('review')) return 'clinical_review';
    return 'clinical_document';
  }

  if (text.includes('lab') || text.includes('laboratorio')) return 'lab_format';
  if (text.includes('käännä') || text.includes('translate') || text.includes('перев')) return 'translation';
  if (text.includes('korjaa') || text.includes('исправ') || text.includes('поправ')) return 'text_fix';
  if (text.includes('lähete') || text.includes('lausunto') || text.includes('arvio') || text.includes('направ')) return 'clinical_document';

  return 'general_chat';
}

function actionsForTask(taskType: AiTaskType): AgentSuggestedAction[] {
  if (taskType === 'template_generation' || taskType === 'template_polish') {
    return [
      { type: 'use_as_template_draft', label: 'Käytä malliluonnoksena' },
      { type: 'open_template_editor', label: 'Avaa mallieditorissa' },
      { type: 'copy_draft', label: 'Kopioi luonnos' },
    ];
  }

  if (taskType === 'tool_design') {
    return [
      { type: 'use_as_ai_tool_prompt', label: 'Käytä AI-työkalun promptina' },
      { type: 'copy_draft', label: 'Kopioi luonnos' },
    ];
  }

  if (taskType === 'clinical_review') {
    return [
      { type: 'review_again', label: 'Tarkista uudelleen' },
      { type: 'copy_draft', label: 'Kopioi ehdotukset' },
    ];
  }

  return [{ type: 'copy_draft', label: 'Kopioi luonnos' }];
}

function systemInstructionForTask(taskType: AiTaskType, contextType: AgentContextType) {
  const base = [
    'You are a supervised AI assistant inside a clinical documentation web application for physicians.',
    'Do not save, apply, modify database records, or claim that anything has been saved.',
    'Produce drafts, analysis, and proposed next actions only.',
    'Do not invent clinical facts not present in the provided material.',
    'If important information is missing, state it clearly and continue with a draft only when reasonable.',
    'Return practical, concise output suitable for a physician working in Finnish healthcare.',
  ].join('\n');

  if (taskType === 'template_generation' || taskType === 'template_polish') {
    return `${base}\nFocus on template structure. Preserve existing template syntax when present. Do not break placeholders, field names, select options, textarea markers, or conditional showIf-like logic.`;
  }

  if (taskType === 'tool_design') {
    return `${base}\nFocus on designing or improving an AI tool prompt. The prompt should be clear, constrained, safe, and reusable. Include output format requirements when useful.`;
  }

  if (taskType === 'clinical_review') {
    return `${base}\nFocus on reviewing clinical logic, missing information, contradictions, medication changes, dates, follow-up, referrals, and patient-safety issues. Do not rewrite unless requested.`;
  }

  if (taskType === 'clinical_document') {
    return `${base}\nFocus on producing a clinically coherent Finnish medical draft based only on provided information. Use professional Finnish medical language.`;
  }

  if (contextType === 'general') {
    return `${base}\nAnswer the user's workflow question directly and propose safe next steps.`;
  }

  return base;
}

export function createAgentPlan(input: {
  contextType: AgentContextType;
  userMessage: string;
  currentText?: string;
  currentTemplate?: string;
}): AgentPlan {
  const taskType = inferTaskType(input.contextType, input.userMessage);

  const userParts = [
    `Context type: ${input.contextType}`,
    `User request:\n${input.userMessage}`,
  ];

  if (input.currentText) userParts.push(`Current text:\n${input.currentText}`);
  if (input.currentTemplate) userParts.push(`Current template:\n${input.currentTemplate}`);

  userParts.push([
    'Return the answer in this structure when applicable:',
    '1. Brief interpretation of the task.',
    '2. Missing or uncertain information, if any.',
    '3. Draft or proposed solution.',
    '4. Suggested next action for the user.',
  ].join('\n'));

  return {
    taskType,
    systemInstruction: systemInstructionForTask(taskType, input.contextType),
    userInstruction: userParts.join('\n\n'),
    suggestedActions: actionsForTask(taskType),
  };
}
