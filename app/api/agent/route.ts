import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/admin-auth';
import { sanitizeAgentInputs } from '../../../lib/ai/agent/agentPrivacy';
import { createAgentPlan } from '../../../lib/ai/agent/agentPlanner';
import type { AgentContextType, AgentRequestBody, AgentUiLanguage } from '../../../lib/ai/agent/types';
import { runRoutedAiCompletion } from '../../../lib/ai/runRoutedAiCompletion';
import { taskAllowsRegistryOnlyReference, taskRequiresEvidence } from '../../../lib/ai/taskTypes';
import {
  buildEvidencePackageFromRetrieved,
  buildNoEvidenceReply,
} from '../../../lib/clinical/evidence/evidencePackage';
import { checkEvidenceConsistency } from '../../../lib/clinical/evidence/checkEvidenceConsistency';
import { retrieveClinicalEvidence } from '../../../lib/clinical/evidence/retrieveClinicalEvidence';
import { getUserClinicalEvidenceConfig } from '../../../lib/clinical/evidence/userClinicalSettings';

function normalizeContextType(value: unknown): AgentContextType {
  if (
    value === 'general' ||
    value === 'clinicalReference' ||
    value === 'malli' ||
    value === 'aiTool' ||
    value === 'clinicalText' ||
    value === 'pikaohje'
  ) {
    return value;
  }

  return 'general';
}

function normalizeUiLanguage(value: unknown): AgentUiLanguage {
  if (value === 'fi' || value === 'ru' || value === 'en') return value;
  return 'fi';
}

function optionalString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n...[truncated]`;
}

function buildConversationContext(body: AgentRequestBody) {
  const turns = Array.isArray(body.conversationContext?.previousTurns)
    ? body.conversationContext.previousTurns.slice(-4)
    : [];

  if (turns.length === 0 && !body.conversationContext?.latestDraft) return '';

  const safeTurns = turns.map((turn, index) => [
    `Turn ${index + 1}`,
    `User: ${truncate(optionalString(turn.userMessage), 1200)}`,
    `Assistant reply: ${truncate(optionalString(turn.assistantReply), 2000)}`,
    turn.assistantDraft ? `Assistant draft: ${truncate(optionalString(turn.assistantDraft), 2000)}` : '',
  ].filter(Boolean).join('\n'));

  return [
    'Previous transient conversation context follows.',
    'Use it only to refine the current task. Do not treat it as independently verified clinical evidence.',
    'Keep all privacy and evidence rules active for the latest user request.',
    body.conversationContext?.latestDraft
      ? `Latest draft to refine:\n${truncate(optionalString(body.conversationContext.latestDraft), 3000)}`
      : '',
    ...safeTurns,
  ].filter(Boolean).join('\n\n');
}

function inputKindForContext(contextType: AgentContextType) {
  if (contextType === 'clinicalText' || contextType === 'pikaohje') return 'clinicalText' as const;
  if (contextType === 'aiTool') return 'storedInstruction' as const;
  if (contextType === 'malli') return 'general' as const;
  if (contextType === 'clinicalReference') return 'general' as const;
  return 'general' as const;
}

function parseDraftFromContent(content: string) {
  const draftHeading =
    /(?:^|\n)(?:3\.\s*)?(?:Draft|Luonnos|Ehdotus|Proposed solution|Korjattu luonnos|Malliluonnos|Promptiluonnos)\s*:?\s*\n/i;
  const match = draftHeading.exec(content);

  if (!match || match.index === undefined) return content.trim();
  return content.slice(match.index + match[0].length).trim();
}

function localizedEvidenceWarnings(
  language: AgentUiLanguage,
  status: string,
  registryOnlyReference = false,
) {
  if (registryOnlyReference) {
    if (language === 'ru') {
      return [
        'Официальные источники для выбранной страны настроены, но текущая версия агента ещё не извлекает автоматически конкретные фрагменты из этих источников. Поэтому ответ должен оставаться справочным: структура сравнения, общие принципы и указание, какие пункты нужно проверить. Нельзя утверждать конкретные различия, дозировки, целевые значения, сроки лечения, red flags или критерии направления без retrieved evidence или вставленного фрагмента источника.',
      ];
    }

    if (language === 'fi') {
      return [
        'Valitun maan viralliset lähteet on määritelty, mutta tämä agenttiversio ei vielä hae automaattisesti varsinaisia lähdekatkelmia. Vastauksen tulee siksi olla yleinen viite-/vertailurakenne. Tarkkoja eroja, annoksia, tavoitearvoja, hoidon kestoja, red flags -kohtia tai lähetekriteereitä ei saa esittää ilman retrieved evidence -tietoja tai käyttäjän liittämää lähdekatkelmaa.',
      ];
    }

    return [
      'Official sources are configured for the selected country, but this agent version does not yet automatically retrieve specific source excerpts. The answer must remain a general reference/comparison framework. Do not state exact differences, dosages, targets, treatment durations, red flags or referral criteria without retrieved evidence or a user-provided source excerpt.',
    ];
  }

  if (status === 'not_found') {
    if (language === 'ru') return ['Для выбранной страны не включены официальные клинические источники.'];
    if (language === 'fi') return ['Valitulle maalle ei ole käytössä virallisia kliinisiä lähteitä.'];
    return ['No enabled official clinical sources are available for the selected country.'];
  }

  if (status === 'partial') {
    if (language === 'ru') {
      return [
        'Реестр официальных источников доступен, но этот MVP ещё не извлекает конкретные фрагменты клинических рекомендаций. Нельзя давать конкретные клинические рекомендации, если пользователь не предоставил текст источника или retrieval-layer не передал evidence facts.',
      ];
    }

    if (language === 'fi') {
      return [
        'Virallinen lähderekisteri on käytettävissä, mutta tämä MVP ei vielä hae varsinaisia suosituskatkelmia. Konkreettisia kliinisiä suosituksia ei saa antaa, ellei käyttäjä anna lähdetekstiä tai myöhempi retrieval-layer toimita evidence facts -tietoja.',
      ];
    }

    return [
      'Official source registry is available, but this MVP does not yet retrieve guideline passages. Do not provide concrete clinical recommendations unless the user provides source text or a later retrieval layer supplies evidence facts.',
    ];
  }

  return [];
}

export async function POST(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);

  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as AgentRequestBody;
    const contextType = normalizeContextType(body.contextType);
    const uiLanguage = normalizeUiLanguage(body.uiLanguage);
    const userMessage = optionalString(body.userMessage).trim();
    const currentText = optionalString(body.currentText);
    const currentTemplate = optionalString(body.currentTemplate);
    const conversationContext = buildConversationContext(body);

    if (!userMessage && !currentText && !currentTemplate && !conversationContext) {
      return NextResponse.json({ error: 'Puuttuvat tiedot' }, { status: 400 });
    }

    const privacyResult = sanitizeAgentInputs([
      { key: 'userMessage', value: userMessage, kind: inputKindForContext(contextType) },
      {
        key: 'currentText',
        value: currentText,
        kind: contextType === 'clinicalText' || contextType === 'pikaohje' ? 'clinicalText' : 'general',
      },
      { key: 'currentTemplate', value: currentTemplate, kind: 'templateSyntax' },
      { key: 'conversationContext', value: conversationContext, kind: inputKindForContext(contextType) },
    ]);

    const plan = createAgentPlan({
      contextType,
      userMessage: privacyResult.sanitized.userMessage,
      currentText: privacyResult.sanitized.currentText,
      currentTemplate: privacyResult.sanitized.currentTemplate,
    });

    const clinicalConfig = await getUserClinicalEvidenceConfig(userId);
    const requiresEvidence = taskRequiresEvidence(plan.taskType);
    const allowsRegistryOnlyReference = taskAllowsRegistryOnlyReference(plan.taskType);
    const retrievedEvidence = await retrieveClinicalEvidence({
      taskType: plan.taskType,
      requiresEvidence: requiresEvidence || allowsRegistryOnlyReference,
      config: clinicalConfig,
      userMessage: privacyResult.sanitized.userMessage,
      currentText: privacyResult.sanitized.currentText,
      currentTemplate: privacyResult.sanitized.currentTemplate,
    });
    const evidence = buildEvidencePackageFromRetrieved({
      taskType: plan.taskType,
      requiresEvidence: requiresEvidence || allowsRegistryOnlyReference,
      config: clinicalConfig,
      retrieved: retrievedEvidence,
    });

    const isRegistryOnlyReference =
      allowsRegistryOnlyReference &&
      (evidence.status === 'partial' || evidence.status === 'not_found');

    const localizedEvidence = {
      ...evidence,
      warnings:
        evidence.warnings.length > 0
          ? evidence.warnings
          : localizedEvidenceWarnings(uiLanguage, evidence.status, isRegistryOnlyReference),
    };

    if (
      requiresEvidence &&
      !allowsRegistryOnlyReference &&
      (evidence.status === 'not_found' || evidence.status === 'partial')
    ) {
      const reply = buildNoEvidenceReply({
        clinicalCountry: evidence.clinicalCountry,
        language: uiLanguage,
        sources: evidence.sources,
      });

      return NextResponse.json({
        reply,
        draft: reply,
        suggestedActions: plan.suggestedActions,
        taskType: plan.taskType,
        provider: null,
        model: null,
        route: {
          taskType: plan.taskType,
          requiresEvidence: true,
          blockedByEvidenceGate: true,
        },
        privacy: privacyResult.privacy,
        evidence: localizedEvidence,
      });
    }

    const evidenceContext = [
      `Clinical country: ${clinicalConfig.clinicalCountry}`,
      `Clinical output language: ${clinicalConfig.clinicalOutputLanguage}`,
      `UI language: ${uiLanguage}`,
      `Evidence strictness: ${clinicalConfig.evidenceStrictness}`,
      `Evidence status: ${evidence.status}`,
      `Registry-only reference mode: ${isRegistryOnlyReference ? 'yes' : 'no'}`,
      `Used sources: ${evidence.sources.map((source) => `${source.name} (${source.trustLevel})`).join(', ') || 'none'}`,
      evidence.excerpts.length > 0
        ? [
            'Retrieved evidence excerpts:',
            ...evidence.excerpts.map((excerpt, index) => [
              `Excerpt ${index + 1}: ${excerpt.title || excerpt.sourceId}`,
              excerpt.url ? `URL: ${excerpt.url}` : '',
              excerpt.text,
            ].filter(Boolean).join('\n')),
          ].join('\n\n')
        : '',
      isRegistryOnlyReference
        ? [
            'The official source registry is configured, but concrete source excerpts have not been automatically retrieved.',
            'For clinical reference or guideline comparison tasks, provide only a safe general framework, structure, and list of items to compare.',
            'Do not state exact guideline differences, target values, medication choices, dosages, treatment durations, red flags, contraindications, or referral thresholds unless they are present in retrieved evidence or a user-provided source excerpt.',
          ].join('\n')
        : '',
    ].filter(Boolean).join('\n\n');

    const messages = [
      { role: 'system' as const, content: plan.systemInstruction },
      { role: 'system' as const, content: evidenceContext },
      privacyResult.sanitized.conversationContext
        ? { role: 'system' as const, content: privacyResult.sanitized.conversationContext }
        : null,
      { role: 'user' as const, content: plan.userInstruction },
    ].filter((message): message is { role: 'system' | 'user'; content: string } => Boolean(message));

    const result = await runRoutedAiCompletion({
      userId,
      taskType: plan.taskType,
      messages,
      temperature: 0,
    });

    const consistencyCheck = checkEvidenceConsistency({
      taskType: plan.taskType,
      answer: result.content,
      evidence: localizedEvidence,
      language: uiLanguage,
    });
    const finalEvidence = {
      ...localizedEvidence,
      warnings: [...localizedEvidence.warnings, ...consistencyCheck.warnings],
      unsupportedClaims: consistencyCheck.unsupportedClaims,
    };

    return NextResponse.json({
      reply: result.content,
      draft: parseDraftFromContent(result.content),
      suggestedActions: plan.suggestedActions,
      taskType: plan.taskType,
      provider: result.provider,
      model: result.model,
      route: result.route,
      privacy: privacyResult.privacy,
      evidence: finalEvidence,
    });
  } catch (err: any) {
    console.error('Agent API error:', err?.message || err);
    return NextResponse.json({ error: 'AI-agentin virhe', details: err?.message }, { status: 500 });
  }
}
