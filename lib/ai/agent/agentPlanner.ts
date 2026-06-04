import type { AgentContextType, AgentPlan, AgentSuggestedAction } from './types';
import type { AiTaskType } from '../taskTypes';

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

const redFlagTerms = [
  'red flag',
  'red flags',
  'hälyttävä oire',
  'hälyttävät oireet',
  'hälytysmerkki',
  'hälytysmerkit',
  'alarm symptom',
  'alarm symptoms',
  'warning sign',
  'warning signs',
  'красный флаг',
  'красные флаги',
  'тревожный симптом',
  'тревожные симптомы',
  'опасный симптом',
  'опасные симптомы',
];

function inferTaskType(contextType: AgentContextType, userMessage: string): AiTaskType {
  const text = userMessage.toLowerCase();

  if (contextType === 'pikaohje') {
    if (includesAny(text, ['tarkista', 'проверь', 'review', 'lähde', 'источ', 'source'])) return 'pikaohje_review';
    return 'pikaohje_generation';
  }

  if (contextType === 'malli') {
    if (includesAny(text, [...redFlagTerms, 'lähetekriteeri', 'hoitosuositus', 'antibiootti', 'hoito-ohje', 'критер', 'лечение', 'рекомендац'])) return 'clinical_advice';
    if (includesAny(text, ['korjaa', 'paranna', 'muokkaa', 'улуч', 'исправ'])) return 'template_polish';
    return 'template_generation';
  }

  if (contextType === 'aiTool') return 'tool_design';

  if (contextType === 'clinicalText') {
    if (includesAny(text, redFlagTerms)) return 'clinical_advice';
    if (includesAny(text, ['lääke', 'annos', 'доза', 'препарат', 'medication'])) return 'medication_guidance';
    if (includesAny(text, ['päivystys', 'kiire', 'urgent', 'срочно', 'неотлож'])) return 'urgent_triage';
    if (includesAny(text, ['lähete', 'направ', 'referral'])) return 'referral_guidance';
    if (includesAny(text, ['tarkista', 'проверь', 'arvioi', 'review'])) return 'clinical_review';
    return 'clinical_document';
  }

  if (includesAny(text, ['lab', 'laboratorio'])) return 'lab_format';
  if (includesAny(text, ['käännä', 'translate', 'перев'])) return 'translation';
  if (includesAny(text, ['korjaa', 'исправ', 'поправ'])) return 'text_fix';
  if (includesAny(text, redFlagTerms)) return 'clinical_advice';
  if (includesAny(text, ['lääke', 'annos', 'доза', 'препарат', 'medication'])) return 'medication_guidance';
  if (includesAny(text, ['päivystys', 'kiire', 'urgent', 'срочно', 'неотлож'])) return 'urgent_triage';
  if (includesAny(text, ['lähete', 'направ', 'referral'])) return 'referral_guidance';
  if (includesAny(text, ['hoito', 'diagnostiikka', 'suositus', 'лечение', 'диагност', 'рекомендац', 'guideline'])) return 'clinical_advice';
  if (includesAny(text, ['lausunto', 'arvio'])) return 'clinical_document';

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

  if (taskType === 'pikaohje_generation' || taskType === 'pikaohje_review') {
    return [
      { type: 'use_as_pikaohje_draft', label: 'Käytä pikaohje-luonnoksena' },
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

function clinicalSafetyInstruction() {
  return [
    'Clinical safety rule:',
    'For clinical recommendations, treatment advice, diagnostic advice, referral criteria, urgent-care triage, medication guidance, red flags or clinical quick guide content, use only the official evidence sources provided by the backend for the selected clinical country.',
    'Do not use general model knowledge as the basis for clinical recommendations.',
    'If the backend says evidence is missing, partial, or not retrieved, clearly state that source support is insufficient and do not add concrete recommendations, dosages, treatment durations, referral criteria, red flags or contraindications.',
    'You may format facts provided by the user, but you must not add new clinical facts without source support.',
  ].join('\n');
}

function systemInstructionForTask(taskType: AiTaskType, contextType: AgentContextType) {
  const base = [
    'You are a supervised AI assistant inside a clinical documentation web application for physicians.',
    'Do not save, apply, modify database records, or claim that anything has been saved.',
    'Produce drafts, analysis, and proposed next actions only.',
    'Do not invent clinical facts not present in the provided material.',
    'If important information is missing, state it clearly and continue with a draft only when reasonable.',
    'Use the clinical output language and clinical country provided by the backend.',
  ].join('\n');

  if (taskType === 'template_generation' || taskType === 'template_polish') {
    return `${base}\nFocus on template structure. Preserve existing template syntax when present. Do not break placeholders, field names, select options, textarea markers, or conditional showIf-like logic.`;
  }

  if (taskType === 'tool_design') {
    return `${base}\nFocus on designing or improving an AI tool prompt. The prompt should be clear, constrained, safe, and reusable. For clinical tools, include a rule that clinical recommendations require official sources for the selected country.`;
  }

  if (
    taskType === 'clinical_review' ||
    taskType === 'clinical_advice' ||
    taskType === 'clinical_source_check' ||
    taskType === 'pikaohje_generation' ||
    taskType === 'pikaohje_review' ||
    taskType === 'medication_guidance' ||
    taskType === 'urgent_triage' ||
    taskType === 'referral_guidance'
  ) {
    return `${base}\n${clinicalSafetyInstruction()}`;
  }

  if (taskType === 'clinical_document') {
    return `${base}\nFocus on producing a clinically coherent medical draft based only on provided information. Do not add new recommendations unless source support is provided.`;
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
