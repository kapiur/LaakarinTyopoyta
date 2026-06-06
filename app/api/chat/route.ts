import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  DEFAULT_AI_TOOL_PROMPTS,
  SYSTEM_PROMPT_MALLI,
  SYSTEM_PROMPT_MEDICAL,
} from '../../../lib/ai/defaultTools';
import { authOptions } from '../../../lib/auth';
import { logAiRunAudit } from '../../../lib/ai/audit/logAiRunAudit';
import { prisma } from '../../../lib/prisma';
import { preparePrivacyPayload } from '../../../lib/privacy/gateway';
import { runAiCompletion } from '../../../lib/ai/runAiCompletion';
import { DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER } from '../../../lib/ai/modelRegistry';
import {
  buildUserAiProfileInstruction,
  defaultProfileModeForTool,
  normalizeAiProfileMode,
  withUserAiProfileInstruction,
  type AiProfileMode,
  type UserAiProfileRecord,
} from '../../../lib/ai/userAiProfile';

const PRIVACY_PLACEHOLDER_SYSTEM_PROMPT = `
Privacy placeholders such as [NAME], [HETU], [DATE_OF_BIRTH], [DATE], [PHONE], [EMAIL], [ADDRESS], [PATIENT_ID], [PROFESSIONAL_NAME] and similar bracketed markers are internal server-side privacy markers.
Do not mention, explain, analyze, repeat or give advice about these placeholders or about anonymization.
Do not tell the user that the text was anonymized or sanitized.
Use the already sanitized text normally and complete the user's actual task.
If a placeholder appears inside source text, treat it as a generic person/detail and produce a natural clinical or administrative formulation when possible.
`;

const MAIN_CHAT_CLINICAL_AUDIENCE_PROMPT = `
This chat is intended exclusively for physicians and other healthcare professionals using the system during clinical work.
Do not answer as if the user were a patient, layperson, family member or general consumer unless the user explicitly asks you to draft patient-facing instructions.
Assume the user needs clinical decision support, documentation support or practical workflow support in the Finnish healthcare context.
Use professional medical terminology and give concise, clinically actionable answers suitable for a doctor at a health centre, urgent care, ward or similar setting.
When useful, structure the answer around differential diagnosis, key history, focused status, investigations, treatment, follow-up, red flags and referral/consultation thresholds.
If patient-facing counselling is relevant, separate it clearly under a heading such as "Potilaalle annettava ohje" rather than making the whole answer patient-directed.
`;

function withPrivacyInstruction(systemPrompt: string) {
  return `${PRIVACY_PLACEHOLDER_SYSTEM_PROMPT}\n\n${systemPrompt}`;
}

function withMainChatClinicalAudience(systemPrompt: string) {
  return `${MAIN_CHAT_CLINICAL_AUDIENCE_PROMPT}\n\n${systemPrompt}`;
}

function applyProfile(systemPrompt: string, profile: UserAiProfileRecord | null, profileMode: AiProfileMode) {
  const profileInstruction = buildUserAiProfileInstruction(profile, profileMode);
  return withUserAiProfileInstruction(systemPrompt, profileInstruction);
}

async function getUserTool(mode: string, userId: number) {
  const rows = await prisma.$queryRaw<Array<{
    prompt: string;
    useUserAiProfile: boolean | null;
    profileMode: string | null;
  }>>`
    SELECT
      "prompt",
      COALESCE("useUserAiProfile", true) AS "useUserAiProfile",
      COALESCE("profileMode", 'full') AS "profileMode"
    FROM "AiTool"
    WHERE "key" = ${mode} AND "userId" = ${userId} AND "scope" = 'USER' AND "isActive" = true
    LIMIT 1
  `;

  const tool = rows[0];
  if (!tool) return null;

  return {
    prompt: tool.prompt,
    profileMode: tool.useUserAiProfile === false ? 'none' as AiProfileMode : normalizeAiProfileMode(tool.profileMode),
  };
}

async function getUserAiProfile(userId: number) {
  try {
    const rows = await prisma.$queryRaw<UserAiProfileRecord[]>`
      SELECT
        "role", "specialty", "workplace", "experienceLevel", "defaultClinicalContext",
        "preferredStructure", "detailLevel", "writingStyle", "permanentInstructions",
        "avoidInstructions", "styleSummary", "useProfileByDefault"
      FROM "UserAiProfile"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;

    return rows[0] ?? null;
  } catch (error) {
    console.error('AI profile loading failed:', error);
    return null;
  }
}

function sanitizeMessages(messages: any[]) {
  const stringMessages = messages
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => message && typeof message.content === 'string');

  const gateway = preparePrivacyPayload(
    stringMessages.map(({ message, index }) => ({
      key: `message_${index}`,
      value: message.content,
      mode: 'transientClinicalChat',
    })),
  );

  const sanitizedMessages = messages.map((message, index) => {
    if (!message || typeof message.content !== 'string') return message;
    return {
      ...message,
      content: gateway.sanitized[`message_${index}`] ?? message.content,
    };
  });

  return {
    sanitizedMessages,
    privacy: gateway.privacy,
  };
}

function buildPrivacyBlockReply() {
  return 'Tekstissä havaittiin tai siihen jäi automaattisen anonymisoinnin jälkeen tunnistetietoja, joita ei voida lähettää AI-käsittelyyn turvallisesti. Poista nimi-, yhteys-, tunniste- ja osoitetiedot ja yritä uudelleen.';
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  let userId: number | null = null;
  try {
    const session = await getServerSession(authOptions);
    userId = Number((session?.user as any)?.id);

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { messages, text, mode, customPrompt } = body;
    const userAiProfile = await getUserAiProfile(userId);
    const messageArray = Array.isArray(messages) ? messages : null;

    const chatGateway = preparePrivacyPayload([
      { key: 'text', value: text, mode: 'transientClinicalChat' },
      { key: 'customPrompt', value: customPrompt, mode: 'persistentStorage' },
    ]);

    let finalMessages: any[] = [];
    let privacy = chatGateway.privacy;

    if (customPrompt && text) {
      finalMessages = [
        { role: 'system', content: withPrivacyInstruction(applyProfile(chatGateway.sanitized.customPrompt, userAiProfile, 'full')) },
        { role: 'user', content: chatGateway.sanitized.text },
      ];
    }
    else if (text && mode && DEFAULT_AI_TOOL_PROMPTS[mode as keyof typeof DEFAULT_AI_TOOL_PROMPTS]) {
      const defaultMode = defaultProfileModeForTool(mode);
      finalMessages = [
        { role: 'system', content: withPrivacyInstruction(applyProfile(DEFAULT_AI_TOOL_PROMPTS[mode as keyof typeof DEFAULT_AI_TOOL_PROMPTS], userAiProfile, defaultMode)) },
        { role: 'user', content: chatGateway.sanitized.text },
      ];
    }
    else if (text && mode) {
      const userTool = await getUserTool(mode, userId);

      if (!userTool) {
        return NextResponse.json({ error: 'AI-työkalua ei löytynyt' }, { status: 404 });
      }

      const toolGateway = preparePrivacyPayload([
        { key: 'userToolPrompt', value: userTool.prompt, mode: 'persistentStorage' },
      ]);
      privacy = {
        ...privacy,
        anonymized: privacy.anonymized || toolGateway.privacy.anonymized,
        findingTypes: Array.from(new Set([...privacy.findingTypes, ...toolGateway.privacy.findingTypes])),
        residualFindingTypes: Array.from(new Set([...privacy.residualFindingTypes, ...toolGateway.privacy.residualFindingTypes])),
        decision: privacy.decision === 'block' || toolGateway.privacy.decision === 'block'
          ? 'block'
          : privacy.decision === 'warn' || toolGateway.privacy.decision === 'warn'
            ? 'warn'
            : 'allow',
        severity: privacy.severity === 'critical' || toolGateway.privacy.severity === 'critical'
          ? 'critical'
          : privacy.severity === 'warning' || toolGateway.privacy.severity === 'warning'
            ? 'warning'
            : 'none',
        blocked: privacy.blocked || toolGateway.privacy.blocked,
      };

      finalMessages = [
        { role: 'system', content: withPrivacyInstruction(applyProfile(toolGateway.sanitized.userToolPrompt, userAiProfile, userTool.profileMode)) },
        { role: 'user', content: chatGateway.sanitized.text },
      ];
    }
    else if (messageArray && messageArray.length > 0) {
      const { sanitizedMessages, privacy: messagePrivacy } = sanitizeMessages(messageArray);
      const lastMessage = sanitizedMessages[sanitizedMessages.length - 1].content;
      privacy = messagePrivacy;

      if (lastMessage.toLowerCase().startsWith('malli:')) {
        finalMessages = [{ role: 'system', content: withPrivacyInstruction(applyProfile(SYSTEM_PROMPT_MALLI, userAiProfile, 'styleOnly')) }, ...sanitizedMessages];
      } else {
        finalMessages = [{ role: 'system', content: withPrivacyInstruction(applyProfile(withMainChatClinicalAudience(SYSTEM_PROMPT_MEDICAL), userAiProfile, 'full')) }, ...sanitizedMessages];
      }
    } else {
      return NextResponse.json({ error: 'Puuttuvat tiedot' }, { status: 400 });
    }

    if (privacy.blocked) {
      await logAiRunAudit({
        userId,
        surface: 'chat',
        taskType: 'general_chat',
        contextType: typeof mode === 'string' ? mode : messageArray && messageArray.length > 0 ? 'conversation' : 'single_turn',
        privacyFindingTypes: Array.from(new Set([...privacy.findingTypes, ...privacy.residualFindingTypes])),
        blockedByEvidenceGate: false,
        latencyMs: Date.now() - startedAt,
        success: true,
      });

      return NextResponse.json({
        content: buildPrivacyBlockReply(),
        privacy,
        route: {
          blockedByPrivacyGate: true,
        },
      });
    }

    const response = await runAiCompletion({
      userId,
      provider: DEFAULT_AI_PROVIDER,
      model: DEFAULT_AI_MODEL,
      messages: finalMessages,
      temperature: 0,
    });

    await logAiRunAudit({
      userId,
      surface: 'chat',
      taskType: 'general_chat',
      contextType: typeof mode === 'string' ? mode : messages && messages.length > 0 ? 'conversation' : 'single_turn',
      provider: response.provider,
      model: response.model,
      privacyFindingTypes: Array.from(new Set([...privacy.findingTypes, ...privacy.residualFindingTypes])),
      blockedByEvidenceGate: false,
      latencyMs: Date.now() - startedAt,
      success: true,
    });

    return NextResponse.json({
      content: response.content,
      privacy,
    });
  } catch (error: any) {
    console.error('AI Error:', error.message || error);
    if (Number.isFinite(userId)) {
      await logAiRunAudit({
        userId: Number(userId),
        surface: 'chat',
        taskType: 'general_chat',
        success: false,
        latencyMs: Date.now() - startedAt,
        errorCode: error.message || 'chat_error',
      });
    }
    return NextResponse.json({
      error: 'AI-palvelinvirhe',
      details: error.message,
    }, { status: 500 });
  }
}
