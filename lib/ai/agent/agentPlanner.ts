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

const comparisonTerms = [
  'compare',
  'comparison',
  'guideline comparison',
  'difference',
  'differences',
  'сравни',
  'сравнение',
  'сравнить',
  'vertaa',
  'vertailu',
];

const referenceTerms = [
  'общая информация',
  'общие принципы',
  'справка',
  'обзор',
  'explain',
  'overview',
  'general principles',
  'what to compare',
  'what should be compared',
  'yleiskuva',
  'selitä',
  'periaatteet',
  'yleiset periaatteet',
  'guideline',
  'recommendation',
  'suositus',
  'рекомендац',
];

const medicationTerms = ['lääke', 'annos', 'доза', 'препарат', 'medication', 'dose', 'dosage'];
const urgentTerms = ['päivystys', 'kiire', 'urgent', 'срочно', 'неотлож'];
const referralTerms = ['lähete', 'направ', 'referral'];
const diagnosticTerms = ['diagnostiikka', 'diagnostic', 'diagnosis', 'anemia', 'diagnosti', 'диагност', 'обслед'];
const adviceTerms = [
  'hoito',
  'lечение',
  'treat',
  'treatment',
  'назнач',
  'prescribe',
  'management',
  'how to treat',
  'как лечить',
  'miten hoitaa',
];

function inferRiskTask(text: string): AiTaskType | null {
  if (includesAny(text, redFlagTerms)) return 'clinical_advice';
  if (includesAny(text, medicationTerms)) return 'medication_guidance';
  if (includesAny(text, urgentTerms)) return 'urgent_triage';
  if (includesAny(text, referralTerms)) return 'referral_guidance';
  if (includesAny(text, adviceTerms)) return 'clinical_advice';
  return null;
}

function looksLikeReferenceQuestion(text: string) {
  return includesAny(text, referenceTerms) || (includesAny(text, comparisonTerms) && includesAny(text, ['guideline', 'recommendation', 'suositus', 'рекомендац', 'клиническ']));
}

function inferTaskType(contextType: AgentContextType, userMessage: string): AiTaskType {
  const text = userMessage.toLowerCase();
  const riskTask = inferRiskTask(text);

  if (contextType === 'clinicalReference') {
    if (riskTask) return riskTask;
    if (includesAny(text, comparisonTerms)) return 'clinical_guideline_comparison';
    return 'clinical_reference';
  }

  if (looksLikeReferenceQuestion(text)) {
    if (includesAny(text, comparisonTerms)) return 'clinical_guideline_comparison';
    if (includesAny(text, diagnosticTerms) || includesAny(text, ['guideline', 'recommendation', 'suositus', 'рекомендац', 'клиническ'])) {
      return 'clinical_reference';
    }
  }

  if (includesAny(text, comparisonTerms) && includesAny(text, ['guideline', 'recommendation', 'suositus', 'рекомендац', 'клиническ'])) {
    return 'clinical_guideline_comparison';
  }

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
    if (riskTask) return riskTask;
    if (includesAny(text, ['tarkista', 'проверь', 'arvioi', 'review'])) return 'clinical_review';
    return 'clinical_document';
  }

  if (includesAny(text, ['lab', 'laboratorio'])) return 'lab_format';
  if (includesAny(text, ['käännä', 'translate', 'перев'])) return 'translation';
  if (includesAny(text, ['korjaa', 'исправ', 'поправ'])) return 'text_fix';
  if (riskTask) return riskTask;
  if (includesAny(text, referenceTerms) && (includesAny(text, diagnosticTerms) || includesAny(text, ['guideline', 'recommendation', 'suositus', 'рекомендац', 'клиническ']))) {
    return 'clinical_reference';
  }
  if (includesAny(text, ['hoito', 'diagnostiikka', 'suositus', 'лечение', 'диагност', 'рекомендац', 'guideline'])) return 'clinical_advice';
  if (includesAny(text, ['lausunto', 'arvio'])) return 'clinical_document';

  return 'general_chat';
}

function actionsForTask(taskType: AiTaskType): AgentSuggestedAction[] {
  if (taskType === 'template_generation' || taskType === 'template_polish') {
    return [
      { type: 'use_as_template_draft' },
      { type: 'open_template_editor' },
      { type: 'copy_draft' },
    ];
  }

  if (taskType === 'pikaohje_generation' || taskType === 'pikaohje_review') {
    return [
      { type: 'use_as_pikaohje_draft' },
      { type: 'copy_draft' },
    ];
  }

  if (taskType === 'tool_design') {
    return [
      { type: 'use_as_ai_tool_prompt' },
      { type: 'copy_draft' },
    ];
  }

  if (taskType === 'clinical_review') {
    return [
      { type: 'review_again' },
      { type: 'copy_draft' },
    ];
  }

  return [{ type: 'copy_draft' }];
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

function clinicalReferenceInstruction() {
  return [
    'Clinical reference mode:',
    'The user is asking for general clinical reference information, education, or guideline comparison, not patient-specific advice.',
    'Do not provide individual patient recommendations.',
    'If the backend provides only a source registry without retrieved evidence excerpts, say that official sources are configured but concrete passages have not yet been automatically retrieved.',
    'In registry-only mode, you may provide a safe structure, comparison framework, and explain what should be compared.',
    'Do not claim exact guideline differences, target values, doses, durations, referral thresholds, contraindications, or red flags unless they are present in provided evidence excerpts.',
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
    'Prefer a clean user-facing answer.',
    'Do not use meta sections such as "Brief interpretation of the task", "Missing or uncertain information", "Draft or proposed solution", or "Suggested next action" unless the user explicitly asks for that format.',
    'When uncertainty matters, mention it briefly inside the answer or as one short final note, not as a separate service block.',
  ].join('\n');

  if (taskType === 'template_generation' || taskType === 'template_polish') {
    return `${base}\nFocus on template structure. Preserve existing template syntax when present. Do not break placeholders, field names, select options, textarea markers, or conditional showIf-like logic.`;
  }

  if (taskType === 'tool_design') {
    return `${base}\nFocus on designing or improving an AI tool prompt. The prompt should be clear, constrained, safe, and reusable. For clinical tools, include a rule that clinical recommendations require official sources for the selected country.`;
  }

  if (taskType === 'clinical_reference' || taskType === 'clinical_guideline_comparison') {
    return `${base}\n${clinicalReferenceInstruction()}`;
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

  if (input.contextType === 'pikaohje' && input.currentTemplate) {
    userParts.push('If you produce an updated quick-guide draft, preserve the same structured format and field labels shown in Current template.');
  }

  userParts.push(
    'Return the final user-facing answer directly. Use bullets or short sections only when they genuinely improve readability for this task.'
  );

  return {
    taskType,
    systemInstruction: systemInstructionForTask(taskType, input.contextType),
    userInstruction: userParts.join('\n\n'),
    suggestedActions: actionsForTask(taskType),
  };
}
