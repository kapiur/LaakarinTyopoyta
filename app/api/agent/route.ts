import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/admin-auth';
import { sanitizeAgentInputs } from '../../../lib/ai/agent/agentPrivacy';
import { createAgentPlan } from '../../../lib/ai/agent/agentPlanner';
import type { AgentContextType, AgentRequestBody } from '../../../lib/ai/agent/types';
import { runRoutedAiCompletion } from '../../../lib/ai/runRoutedAiCompletion';
import { taskRequiresEvidence } from '../../../lib/ai/taskTypes';
import { buildInitialEvidencePackage, buildNoEvidenceReply } from '../../../lib/clinical/evidence/evidencePackage';
import { getUserClinicalEvidenceConfig } from '../../../lib/clinical/evidence/userClinicalSettings';

function normalizeContextType(value: unknown): AgentContextType {
  if (value === 'general' || value === 'malli' || value === 'aiTool' || value === 'clinicalText' || value === 'pikaohje') return value;
  return 'general';
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
    const evidence = buildInitialEvidencePackage({
      taskType: plan.taskType,
      requiresEvidence,
      config: clinicalConfig,
    });

    if (requiresEvidence && (evidence.status === 'not_found' || evidence.status === 'partial')) {
      const reply = buildNoEvidenceReply({
        clinicalCountry: evidence.clinicalCountry,
        language: evidence.clinicalOutputLanguage,
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
        evidence,
      });
    }

    const evidenceContext = [
      `Clinical country: ${clinicalConfig.clinicalCountry}`,
      `Clinical output language: ${clinicalConfig.clinicalOutputLanguage}`,
      `Evidence strictness: ${clinicalConfig.evidenceStrictness}`,
      `Evidence status: ${evidence.status}`,
      `Allowed sources: ${evidence.sources.map((source) => `${source.name} (${source.trustLevel})`).join(', ') || 'none'}`,
    ].join('\n');

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
      evidence,
    });
  } catch (err: any) {
    console.error('Agent API error:', err?.message || err);
    return NextResponse.json({ error: 'AI-agentin virhe', details: err?.message }, { status: 500 });
  }
}
