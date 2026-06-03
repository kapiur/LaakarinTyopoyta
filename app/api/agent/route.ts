import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/admin-auth';
import { sanitizeAgentInputs } from '../../../lib/ai/agent/agentPrivacy';
import { createAgentPlan } from '../../../lib/ai/agent/agentPlanner';
import type { AgentContextType, AgentRequestBody } from '../../../lib/ai/agent/types';
import { runRoutedAiCompletion } from '../../../lib/ai/runRoutedAiCompletion';

function normalizeContextType(value: unknown): AgentContextType {
  if (value === 'general' || value === 'malli' || value === 'aiTool' || value === 'clinicalText') return value;
  return 'general';
}

function optionalString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function inputKindForContext(contextType: AgentContextType) {
  if (contextType === 'clinicalText') return 'clinicalText' as const;
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
      { key: 'currentText', value: currentText, kind: contextType === 'clinicalText' ? 'clinicalText' : 'general' },
      { key: 'currentTemplate', value: currentTemplate, kind: 'templateSyntax' },
    ]);

    const plan = createAgentPlan({
      contextType,
      userMessage: privacyResult.sanitized.userMessage,
      currentText: privacyResult.sanitized.currentText,
      currentTemplate: privacyResult.sanitized.currentTemplate,
    });

    const result = await runRoutedAiCompletion({
      userId,
      taskType: plan.taskType,
      messages: [
        { role: 'system', content: plan.systemInstruction },
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
    });
  } catch (err: any) {
    console.error('Agent API error:', err?.message || err);
    return NextResponse.json({ error: 'AI-agentin virhe', details: err?.message }, { status: 500 });
  }
}
