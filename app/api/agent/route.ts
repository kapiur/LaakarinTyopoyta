import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/admin-auth';
import { sanitizeAgentInputs, type AgentPrivacyInputKind } from '../../../lib/ai/agent/agentPrivacy';
import { createAgentPlan } from '../../../lib/ai/agent/agentPlanner';
import { logAiRunAudit } from '../../../lib/ai/audit/logAiRunAudit';
import type { AgentContextType, AgentRequestBody, AgentUiLanguage } from '../../../lib/ai/agent/types';
import { runRoutedAiCompletion } from '../../../lib/ai/runRoutedAiCompletion';
import { preparePrivacyPayload } from '../../../lib/privacy/gateway';
import { hasCriticalPrivacyFindingTypes } from '../../../lib/privacy/gateway/decision';
import { taskAllowsRegistryOnlyReference, taskRequiresEvidence } from '../../../lib/ai/taskTypes';
import { normalizeUiLanguage as normalizeSharedUiLanguage } from '../../../lib/i18n/config';
import {
  buildEvidencePackageFromRetrieved,
  buildNoEvidenceReply,
} from '../../../lib/clinical/evidence/evidencePackage';
import { checkEvidenceConsistency } from '../../../lib/clinical/evidence/checkEvidenceConsistency';
import { retrieveClinicalEvidence } from '../../../lib/clinical/evidence/retrieveClinicalEvidence';
import {
  getUserClinicalEvidenceConfig,
  type UserClinicalEvidenceConfig,
} from '../../../lib/clinical/evidence/userClinicalSettings';
import {
  buildWorkspaceContextInstruction,
  getUserAiWorkspaceContext,
} from '../../../lib/ai/workspaceContext';
import { buildUserAiProfileInstruction } from '../../../lib/ai/userAiProfile';
import { getUserAiProfile } from '../../../lib/ai/userAiProfileStore';

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
  return normalizeSharedUiLanguage(value);
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

function normalizePrivacyInputKind(value: unknown, fallback: AgentPrivacyInputKind) {
  if (
    value === 'clinicalText' ||
    value === 'profileSample' ||
    value === 'storedInstruction' ||
    value === 'publicSourceText' ||
    value === 'templateSyntax' ||
    value === 'general'
  ) {
    return value;
  }

  return fallback;
}

function normalizeHeadingLine(line: string) {
  return line
    .toLowerCase()
    .replace(/\r/g, '')
    .replace(/\*\*/g, '')
    .replace(/^[-\s]+/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/\s*[:：]\s*$/, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDraftHeading(line: string) {
  const normalized = normalizeHeadingLine(line);
  return [
    'draft',
    'luonnos',
    'ehdotus',
    'proposed solution',
    'korjattu luonnos',
    'malliluonnos',
    'promptiluonnos',
    'черновик/предлагаемое решение',
    'предлагаемое решение',
    'предлагаемый вариант',
  ].some((candidate) => normalized === candidate || normalized.startsWith(candidate));
}

function isNextActionHeading(line: string) {
  const normalized = normalizeHeadingLine(line);
  return [
    'suggested next action',
    'recommended next action',
    'ehdotettu seuraava toiminto',
    'suositeltu seuraava toiminto',
    'рекомендуемое следующее действие',
  ].some((candidate) => normalized === candidate || normalized.startsWith(candidate));
}

function parseDraftFromContent(content: string) {
  const normalizedContent = content.replace(/\r/g, '').trim();
  if (!normalizedContent) return '';

  const lines = normalizedContent.split('\n');
  const draftStartIndex = lines.findIndex((line) => isDraftHeading(line));
  if (draftStartIndex !== -1) {
    const afterDraftLines = lines.slice(draftStartIndex + 1);
    const nextActionIndex = afterDraftLines.findIndex((line) => isNextActionHeading(line));
    const keptLines = nextActionIndex === -1 ? afterDraftLines : afterDraftLines.slice(0, nextActionIndex);

    return keptLines.join('\n').trim();
  }

  const heading1Index = lines.findIndex((line) => /^\s*1[.)]\s+/.test(line));
  const heading2Index = lines.findIndex((line, index) => index > heading1Index && /^\s*2[.)]\s+/.test(line));
  const heading3Index = lines.findIndex((line, index) => index > heading2Index && /^\s*3[.)]\s+/.test(line));
  const heading4Index = lines.findIndex((line, index) => index > heading3Index && /^\s*4[.)]\s+/.test(line));

  if (heading1Index !== -1 && heading2Index !== -1 && heading3Index !== -1) {
    const keptLines = heading4Index === -1 ? lines.slice(heading3Index + 1) : lines.slice(heading3Index + 1, heading4Index);
    const fallbackDraft = keptLines.join('\n').trim();
    if (fallbackDraft) {
      return fallbackDraft;
    }
  }

  return normalizedContent;
}

function normalizeReplyForDisplay(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return trimmed;

  const extractedDraft = parseDraftFromContent(trimmed);
  if (extractedDraft && extractedDraft !== trimmed) {
    return extractedDraft;
  }

  return trimmed;
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

function buildPrivacyBlockReply(language: AgentUiLanguage) {
  if (language === 'ru') {
    return 'В тексте остались идентифицирующие данные после автоматической анонимизации. Агент не отправит такой текст во внешний AI. Удали имя, контакты, идентификаторы, адрес и другие персональные данные и попробуй снова.';
  }

  if (language === 'en') {
    return 'Identifying details remain in the text after automatic anonymisation. The agent will not send this text to an external AI service. Remove names, contact details, identifiers, addresses and other personal data, then try again.';
  }

  if (language === 'de') {
    return 'Nach der automatischen Anonymisierung sind noch identifizierende Angaben im Text vorhanden. Der Agent sendet diesen Text nicht an einen externen AI-Dienst. Entferne Namen, Kontaktdaten, Kennungen, Adressen und andere personenbezogene Daten und versuche es erneut.';
  }

  return 'Tekstiin jäi automaattisen anonymisoinnin jälkeen tunnistetietoja. Agentti ei lähetä tällaista tekstiä ulkoiseen AI-palveluun. Poista nimet, yhteystiedot, tunnisteet, osoitteet ja muut henkilötiedot ja yritä uudelleen.';
}

function buildPrivacyOutputBlockReply(language: AgentUiLanguage) {
  if (language === 'ru') {
    return 'Ответ агента содержал данные, похожие на персональные, поэтому он скрыт по соображениям безопасности. Переформулируй запрос более общо и без идентификаторов.';
  }

  if (language === 'en') {
    return 'The agent response appeared to contain personal data, so it has been withheld for safety. Please reformulate the request more generally and without identifiers.';
  }

  if (language === 'de') {
    return 'Die Antwort des Agenten schien personenbezogene Daten zu enthalten und wurde deshalb aus Sicherheitsgruenden ausgeblendet. Bitte formuliere die Anfrage allgemeiner und ohne Identifikatoren neu.';
  }

  return 'Agentin vastaus sisälsi henkilötietoihin viittaavia tietoja, joten sitä ei näytetä turvallisuussyistä. Muotoile pyyntö yleisemmin ilman tunnistetietoja ja yritä uudelleen.';
}

function buildEvidenceModeInstruction(config: UserClinicalEvidenceConfig) {
  const shared = [
    `Evidence operating mode: ${config.evidenceStrictness}.`,
    'Regional and source-selection settings are user-controlled workspace defaults and must be respected throughout the answer.',
  ];

  if (config.evidenceStrictness === 'strict') {
    return [
      ...shared,
      'Use only enabled official sources from the selected clinical country as the basis for clinical claims.',
      'Local workflow instructions may be mentioned only as operational context, never as justification for diagnosis, treatment choice, target values, dosing, contraindications, red flags, or referral thresholds.',
      'If retrieved evidence is missing or incomplete, stay conservative, state the uncertainty plainly, and do not fill gaps from general model knowledge.',
    ].join('\n');
  }

  if (config.evidenceStrictness === 'local-aware') {
    return [
      ...shared,
      'Use enabled official national sources first for clinical claims.',
      'Enabled local or hospital sources may supplement workflow framing, local process notes, or documentation conventions, but keep them clearly separate from national clinical recommendations.',
      'If official evidence is missing, do not turn local instructions into stand-in clinical authority.',
    ].join('\n');
  }

  return [
    ...shared,
    'Use enabled official sources first and keep them primary in the reasoning and wording.',
    'Supplementary enabled sources may be used only to add context or clarify implementation details, and you must preserve the distinction between official recommendations and supplementary material.',
    'Do not overstate certainty beyond the retrieved evidence.',
  ].join('\n');
}

function buildGroundingRetryInstruction(unsupportedClaims: string[]) {
  const claimsBlock = unsupportedClaims.length > 0
    ? unsupportedClaims.map((claim, index) => `${index + 1}. ${claim}`).join('\n')
    : 'No specific claims were extracted, but the previous answer exceeded the retrieved evidence.';

  return [
    'Revise the previous answer so that every clinical claim is directly grounded in the retrieved evidence and workspace settings.',
    'Remove, soften, or explicitly mark as uncertain any statement that is not supported by the available excerpts or approved source context.',
    'Do not add new unsupported claims during the rewrite.',
    'Claims flagged for revision:',
    claimsBlock,
  ].join('\n\n');
}

export async function POST(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;
  const startedAt = Date.now();

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
    const defaultInputKind = inputKindForContext(contextType);
    const currentTextKind = normalizePrivacyInputKind(
      body.currentTextKind,
      contextType === 'clinicalText' || contextType === 'pikaohje' ? 'clinicalText' : 'general',
    );
    const currentTemplateKind = normalizePrivacyInputKind(body.currentTemplateKind, 'templateSyntax');
    const conversationContextKind = normalizePrivacyInputKind(body.conversationContextKind, defaultInputKind);

    if (!userMessage && !currentText && !currentTemplate && !conversationContext) {
      return NextResponse.json({ error: 'Puuttuvat tiedot' }, { status: 400 });
    }

    const privacyResult = sanitizeAgentInputs([
      { key: 'userMessage', value: userMessage, kind: defaultInputKind },
      { key: 'currentText', value: currentText, kind: currentTextKind },
      { key: 'currentTemplate', value: currentTemplate, kind: currentTemplateKind },
      { key: 'conversationContext', value: conversationContext, kind: conversationContextKind },
    ]);

    if (privacyResult.privacy.blocked) {
      const reply = buildPrivacyBlockReply(uiLanguage);

      await logAiRunAudit({
        userId,
        surface: 'agent',
        taskType: 'privacy_block',
        contextType,
        privacyFindingTypes: Array.from(new Set([
          ...privacyResult.privacy.findingTypes,
          ...privacyResult.privacy.residualFindingTypes,
        ])),
        blockedByEvidenceGate: false,
        latencyMs: Date.now() - startedAt,
        success: true,
      });

      return NextResponse.json({
        reply,
        draft: reply,
        suggestedActions: [],
        taskType: 'privacy_block',
        provider: null,
        model: null,
        route: {
          taskType: 'privacy_block',
          requiresEvidence: false,
          blockedByPrivacyGate: true,
        },
        privacy: privacyResult.privacy,
        evidence: {
          status: 'not_required',
          level: 'privacy_block',
          clinicalCountry: '',
          clinicalOutputLanguage: uiLanguage,
          requiresEvidence: false,
          sources: [],
          warnings: [],
          unsupportedClaims: [],
        },
      });
    }

    const plan = createAgentPlan({
      contextType,
      userMessage: privacyResult.sanitized.userMessage,
      currentText: privacyResult.sanitized.currentText,
      currentTemplate: privacyResult.sanitized.currentTemplate,
    });

    const clinicalConfigPromise = getUserClinicalEvidenceConfig(userId, { surface: 'agent' });
    const userAiProfilePromise = getUserAiProfile(userId);
    const clinicalConfig = await clinicalConfigPromise;
    const [workspaceContext, userAiProfile] = await Promise.all([
      getUserAiWorkspaceContext(userId, { clinicalConfig }),
      userAiProfilePromise,
    ]);
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

      await logAiRunAudit({
        userId,
        surface: 'agent',
        taskType: plan.taskType,
        contextType,
        clinicalCountry: clinicalConfig.clinicalCountry,
        evidenceStatus: localizedEvidence.status,
        privacyFindingTypes: Array.from(new Set([
          ...privacyResult.privacy.findingTypes,
          ...privacyResult.privacy.residualFindingTypes,
        ])),
        blockedByEvidenceGate: true,
        latencyMs: Date.now() - startedAt,
        success: true,
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

    const profileInstruction = buildUserAiProfileInstruction(userAiProfile, 'full', workspaceContext);
    const evidenceContext = [
      buildWorkspaceContextInstruction(workspaceContext, {
        contentLabel: 'clinician-facing agent output',
      }),
      buildEvidenceModeInstruction(clinicalConfig),
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
      profileInstruction ? { role: 'system' as const, content: profileInstruction } : null,
      { role: 'system' as const, content: plan.systemInstruction },
      { role: 'system' as const, content: evidenceContext },
      privacyResult.sanitized.conversationContext
        ? { role: 'system' as const, content: privacyResult.sanitized.conversationContext }
        : null,
      { role: 'user' as const, content: plan.userInstruction },
    ].filter((message): message is { role: 'system' | 'user'; content: string } => Boolean(message));

    let result = await runRoutedAiCompletion({
      userId,
      taskType: plan.taskType,
      messages,
      temperature: 0,
    });

    let outputPrivacy = preparePrivacyPayload([
      { key: 'output', value: result.content, mode: 'persistentStorage' },
    ]);
    let safeOutputContent = outputPrivacy.sanitized.output ?? result.content;

    if (
      outputPrivacy.privacy.blocked &&
      hasCriticalPrivacyFindingTypes([
        ...outputPrivacy.privacy.findingTypes,
        ...outputPrivacy.privacy.residualFindingTypes,
      ])
    ) {
      const reply = buildPrivacyOutputBlockReply(uiLanguage);

      await logAiRunAudit({
        userId,
        surface: 'agent',
        taskType: 'privacy_output_block',
        contextType,
        provider: result.provider,
        model: result.model,
        clinicalCountry: clinicalConfig.clinicalCountry,
        evidenceStatus: localizedEvidence.status,
        privacyFindingTypes: Array.from(new Set([
          ...privacyResult.privacy.findingTypes,
          ...privacyResult.privacy.residualFindingTypes,
          ...outputPrivacy.privacy.findingTypes,
          ...outputPrivacy.privacy.residualFindingTypes,
        ])),
        blockedByEvidenceGate: false,
        latencyMs: Date.now() - startedAt,
        success: true,
      });

      return NextResponse.json({
        reply,
        draft: reply,
        suggestedActions: [],
        taskType: 'privacy_output_block',
        provider: null,
        model: null,
        route: {
          taskType: 'privacy_output_block',
          requiresEvidence: false,
          blockedByPrivacyGate: true,
          blockedByOutputPrivacyGate: true,
        },
        privacy: privacyResult.privacy,
        evidence: localizedEvidence,
      });
    }

    let consistencyCheck = checkEvidenceConsistency({
      taskType: plan.taskType,
      answer: safeOutputContent,
      evidence: localizedEvidence,
      language: uiLanguage,
    });

    if (requiresEvidence && consistencyCheck.unsupportedClaims.length > 0) {
      const retryResult = await runRoutedAiCompletion({
        userId,
        taskType: plan.taskType,
        messages: [
          ...messages,
          { role: 'assistant', content: safeOutputContent },
          { role: 'system', content: buildGroundingRetryInstruction(consistencyCheck.unsupportedClaims) },
        ],
        temperature: 0,
      });

      const retryOutputPrivacy = preparePrivacyPayload([
        { key: 'output', value: retryResult.content, mode: 'persistentStorage' },
      ]);
      const retrySafeOutputContent = retryOutputPrivacy.sanitized.output ?? retryResult.content;

      if (
        !(
          retryOutputPrivacy.privacy.blocked &&
          hasCriticalPrivacyFindingTypes([
            ...retryOutputPrivacy.privacy.findingTypes,
            ...retryOutputPrivacy.privacy.residualFindingTypes,
          ])
        )
      ) {
        const retryConsistencyCheck = checkEvidenceConsistency({
          taskType: plan.taskType,
          answer: retrySafeOutputContent,
          evidence: localizedEvidence,
          language: uiLanguage,
        });

        if (
          retryConsistencyCheck.unsupportedClaims.length <= consistencyCheck.unsupportedClaims.length
        ) {
          result = retryResult;
          outputPrivacy = retryOutputPrivacy;
          safeOutputContent = retrySafeOutputContent;
          consistencyCheck = retryConsistencyCheck;
        }
      }
    }

    const finalEvidence = {
      ...localizedEvidence,
      warnings: [...localizedEvidence.warnings, ...consistencyCheck.warnings],
      unsupportedClaims: consistencyCheck.unsupportedClaims,
    };

    await logAiRunAudit({
      userId,
      surface: 'agent',
      taskType: plan.taskType,
      contextType,
      provider: result.provider,
      model: result.model,
      clinicalCountry: clinicalConfig.clinicalCountry,
      evidenceStatus: finalEvidence.status,
      privacyFindingTypes: Array.from(new Set([
        ...privacyResult.privacy.findingTypes,
        ...privacyResult.privacy.residualFindingTypes,
        ...outputPrivacy.privacy.findingTypes,
        ...outputPrivacy.privacy.residualFindingTypes,
      ])),
      blockedByEvidenceGate: false,
      latencyMs: Date.now() - startedAt,
      success: true,
    });

    const displayContent = normalizeReplyForDisplay(safeOutputContent);
    const displayDraft = parseDraftFromContent(displayContent);

    return NextResponse.json({
      reply: displayContent,
      draft: displayDraft,
      suggestedActions: plan.suggestedActions,
      taskType: plan.taskType,
      provider: result.provider,
      model: result.model,
      route: {
        ...result.route,
        outputSanitized: outputPrivacy.privacy.anonymized,
      },
      privacy: privacyResult.privacy,
      evidence: finalEvidence,
    });
  } catch (err: any) {
    console.error('Agent API error:', err?.message || err);
    if (Number.isFinite(userId)) {
      await logAiRunAudit({
        userId,
        surface: 'agent',
        success: false,
        latencyMs: Date.now() - startedAt,
        errorCode: err?.message || 'agent_error',
      });
    }
    return NextResponse.json({ error: 'AI-agentin virhe', details: err?.message }, { status: 500 });
  }
}
