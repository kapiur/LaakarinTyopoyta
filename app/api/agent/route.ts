import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/admin-auth';
import { sanitizeAgentInputs } from '../../../lib/ai/agent/agentPrivacy';
import { createAgentPlan } from '../../../lib/ai/agent/agentPlanner';
import type { AgentContextType, AgentRequestBody, AgentUiLanguage } from '../../../lib/ai/agent/types';
import { runRoutedAiCompletion } from '../../../lib/ai/runRoutedAiCompletion';
import { taskRequiresEvidence } from '../../../lib/ai/taskTypes';
import { buildInitialEvidencePackage, buildNoEvidenceReply, type EvidencePackage } from '../../../lib/clinical/evidence/evidencePackage';
import { getUserClinicalEvidenceConfig } from '../../../lib/clinical/evidence/userClinicalSettings';

function normalizeContextType(value: unknown): AgentContextType {
  if (value === 'general' || value === 'malli' || value === 'aiTool' || value === 'clinicalText' || value === 'pikaohje') return value;
  return 'general';
}

function normalizeUiLanguage(value: unknown): AgentUiLanguage {
  if (value === 'fi' || value === 'ru' || value === 'en') return value;
  return 'fi';
}

function optionalString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function inputKindForContext(contextType: AgentContextType) {
  if (contextType === 'clinicalText' || contextType === 'pikaohje') return 'clinicalText' as const;
  if (contextType === 'aiTool') return 'storedInstruction' as const;
  if (contextType === 'malli') return 'general' as const;
  return 'general' as const;
}

function parseDraftFromContent(content: string) {
  const draftHeading = /(?:^|\n)(?:3\.\s*)?(?:Draft|Luonnos|Ehdotus|Proposed solution|Korjattu luonnos|Malliluonnos|Promptiluonnos)\s*:?\s*\n/i;
  const match = draftHeading.exec(content);
  if (!match || match.index === undefined) return content.trim();
  return content.slice(match.index + match[0].length).trim();
}

function localizedEvidenceWarnings(language: AgentUiLanguage, status: string) {
  if (status === 'not_found') {
    if (language === 'ru') return ['Для выбранной страны не включены официальные клинические источники.'];
    if (language === 'fi') return ['Valitulle maalle ei ole käytössä virallisia kliinisiä lähteitä.'];
    return ['No enabled official clinical sources are available for the selected country.'];
  }

  if (status === 'partial') {
    if (language === 'ru') {
      return ['Реестр официальных источников доступен, но этот MVP ещё не извлекает конкретные фрагменты клинических рекомендаций. Нельзя давать конкретные клинические рекомендации, если пользователь не предоставил текст источника или retrieval-layer не передал evidence facts.'];
    }
    if (language === 'fi') {
      return ['Virallinen lähderekisteri on käytettävissä, mutta tämä MVP ei vielä hae varsinaisia suosituskatkelmia. Konkreettisia kliinisiä suosituksia ei saa antaa, ellei käyttäjä anna lähdetekstiä tai myöhempi retrieval-layer toimita evidence facts -tietoja.'];
    }
    return ['Official source registry is available, but this MVP does not yet retrieve guideline passages. Do not provide concrete clinical recommendations unless the user provides source text or a later retrieval layer supplies evidence facts.'];
  }

  return [];
}

function userProvidedEvidenceWarning(language: AgentUiLanguage) {
  if (language === 'ru') {
    return 'Используется фрагмент источника, вставленный пользователем. Он не был независимо проверен системой. Агент должен отвечать только в пределах этого фрагмента.';
  }
  if (language === 'fi') {
    return 'Käytössä on käyttäjän liittämä lähdekatkelma. Järjestelmä ei ole tarkistanut sitä itsenäisesti. Agentin tulee vastata vain tämän katkelman perusteella.';
  }
  return 'Using a source excerpt pasted by the user. It has not been independently verified by the system. The agent must answer only within this excerpt.';
}

function hasPotentialUserProvidedEvidence(text: string) {
  const normalized = text.toLowerCase();
  const compactLength = normalized.replace(/\s+/g, ' ').trim().length;
  if (compactLength < 300) return false;

  const sourceMarkers = [
    'käypä hoito',
    'kaypahoito',
    'terveyskirjasto',
    'lääkärikirja',
    'duodecim',
    'thl',
    'hus',
    'keusote',
    'minzdrav',
    'минздрав',
    'клинические рекомендации',
    'государственный реестр лекарственных средств',
    'грлс',
    'rospotrebnadzor',
    'роспотребнадзор',
    'suositus',
    'hoitosuositus',
    'ohje',
    'lähde',
    'source',
    'guideline',
    'recommendation',
    'рекомендац',
    'инструкция',
    'официальн',
  ];

  return sourceMarkers.some((marker) => normalized.includes(marker));
}

function applyUserProvidedEvidence(input: {
  evidence: EvidencePackage;
  sourceText: string;
  uiLanguage: AgentUiLanguage;
}): EvidencePackage {
  if (!input.evidence.requiresEvidence || !hasPotentialUserProvidedEvidence(input.sourceText)) return input.evidence;

  return {
    ...input.evidence,
    status: 'found',
    level: 'official_reference',
    sources: [
      {
        id: 'user-provided-source-excerpt',
        name: input.uiLanguage === 'ru' ? 'Фрагмент источника, вставленный пользователем' : input.uiLanguage === 'fi' ? 'Käyttäjän liittämä lähdekatkelma' : 'User-provided source excerpt',
        sourceType: 'user_provided_excerpt',
        trustLevel: 'user_provided_not_independently_verified',
        baseUrl: undefined,
      },
    ],
    warnings: [userProvidedEvidenceWarning(input.uiLanguage)],
  };
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

    if (!userMessage && !currentText && !currentTemplate) {
      return NextResponse.json({ error: 'Puuttuvat tiedot' }, { status: 400 });
    }

    const privacyResult = sanitizeAgentInputs([
      { key: 'userMessage', value: userMessage, kind: inputKindForContext(contextType) },
      { key: 'currentText', value: currentText, kind: contextType === 'clinicalText' || contextType === 'pikaohje' ? 'clinicalText' : 'general' },
      { key: 'currentTemplate', value: currentTemplate, kind: 'templateSyntax' },
    ]);

    const plan = createAgentPlan({
      contextType,
      userMessage: privacyResult.sanitized.userMessage,
      currentText: privacyResult.sanitized.currentText,
      currentTemplate: privacyResult.sanitized.currentTemplate,
    });

    const clinicalConfig = await getUserClinicalEvidenceConfig(userId);
    const requiresEvidence = taskRequiresEvidence(plan.taskType);
    const initialEvidence = buildInitialEvidencePackage({
      taskType: plan.taskType,
      requiresEvidence,
      config: clinicalConfig,
    });

    const evidence = applyUserProvidedEvidence({
      evidence: initialEvidence,
      sourceText: privacyResult.sanitized.currentText,
      uiLanguage,
    });

    const localizedEvidence = {
      ...evidence,
      warnings: evidence.warnings.length > 0 ? evidence.warnings : localizedEvidenceWarnings(uiLanguage, evidence.status),
    };

    if (requiresEvidence && (evidence.status === 'not_found' || evidence.status === 'partial')) {
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
      `Used sources: ${evidence.sources.map((source) => `${source.name} (${source.trustLevel})`).join(', ') || 'none'}`,
      hasPotentialUserProvidedEvidence(privacyResult.sanitized.currentText)
        ? [
            'User-provided evidence excerpt is present below.',
            'Use it as the only clinical evidence for concrete recommendations.',
            'Do not add clinical claims, dosages, referral criteria, red flags or treatment instructions that are not supported by the excerpt.',
            `User-provided evidence excerpt:\n${privacyResult.sanitized.currentText}`,
          ].join('\n')
        : '',
    ].filter(Boolean).join('\n\n');

    const result = await runRoutedAiCompletion({
      userId,
      taskType: plan.taskType,
      messages: [
        { role: 'system', content: plan.systemInstruction },
        { role: 'system', content: evidenceContext },
        { role: 'user', content: plan.userInstruction },
      ],
      temperature: 0,
    });

    return NextResponse.json({
      reply: result.content,
      draft: parseDraftFromContent(result.content),
      suggestedActions: plan.suggestedActions,
      taskType: plan.taskType,
      provider: result.provider,
      model: result.model,
      route: result.route,
      privacy: privacyResult.privacy,
      evidence: localizedEvidence,
    });
  } catch (err: any) {
    console.error('Agent API error:', err?.message || err);
    return NextResponse.json({ error: 'AI-agentin virhe', details: err?.message }, { status: 500 });
  }
}
