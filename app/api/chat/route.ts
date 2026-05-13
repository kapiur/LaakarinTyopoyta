import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  DEFAULT_AI_TOOL_PROMPTS,
  SYSTEM_PROMPT_MALLI,
  SYSTEM_PROMPT_MEDICAL,
} from '../../../lib/ai/defaultTools';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { anonymizePatientText, mergeAnonymizationResults } from '../../../lib/privacy/anonymizePatientText';
import {
  buildUserAiProfileInstruction,
  defaultProfileModeForTool,
  normalizeAiProfileMode,
  withUserAiProfileInstruction,
  type AiProfileMode,
  type UserAiProfileRecord,
} from '../../../lib/ai/userAiProfile';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CURRENT_MODEL = 'gpt-5.4';

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

function anonymizeMessages(messages: any[]) {
  const anonymizationResults: ReturnType<typeof anonymizePatientText>[] = [];

  const sanitizedMessages = messages.map((message) => {
    if (!message || typeof message.content !== 'string') return message;

    const result = anonymizePatientText(message.content, { mode: 'chat' });
    anonymizationResults.push(result);

    return {
      ...message,
      content: result.sanitizedText,
    };
  });

  return {
    sanitizedMessages,
    anonymization: mergeAnonymizationResults(anonymizationResults),
  };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number((session?.user as any)?.id);

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { messages, text, mode, customPrompt } = body;
    const inputAnonymizationResults: ReturnType<typeof anonymizePatientText>[] = [];
    const userAiProfile = await getUserAiProfile(userId);

    const anonymizedText = anonymizePatientText(text, { mode: 'chat' });
    inputAnonymizationResults.push(anonymizedText);

    const anonymizedCustomPrompt = anonymizePatientText(customPrompt, { mode: 'storage' });
    inputAnonymizationResults.push(anonymizedCustomPrompt);

    let finalMessages: any[] = [];

    if (customPrompt && text) {
      finalMessages = [
        { role: 'system', content: withPrivacyInstruction(applyProfile(anonymizedCustomPrompt.sanitizedText, userAiProfile, 'full')) },
        { role: 'user', content: anonymizedText.sanitizedText },
      ];
    }
    else if (text && mode && DEFAULT_AI_TOOL_PROMPTS[mode as keyof typeof DEFAULT_AI_TOOL_PROMPTS]) {
      const defaultMode = defaultProfileModeForTool(mode);
      finalMessages = [
        { role: 'system', content: withPrivacyInstruction(applyProfile(DEFAULT_AI_TOOL_PROMPTS[mode as keyof typeof DEFAULT_AI_TOOL_PROMPTS], userAiProfile, defaultMode)) },
        { role: 'user', content: anonymizedText.sanitizedText },
      ];
    }
    else if (text && mode) {
      const userTool = await getUserTool(mode, userId);

      if (!userTool) {
        return NextResponse.json({ error: 'AI-työkalua ei löytynyt' }, { status: 404 });
      }

      const anonymizedUserToolPrompt = anonymizePatientText(userTool.prompt, { mode: 'storage' });
      inputAnonymizationResults.push(anonymizedUserToolPrompt);

      finalMessages = [
        { role: 'system', content: withPrivacyInstruction(applyProfile(anonymizedUserToolPrompt.sanitizedText, userAiProfile, userTool.profileMode)) },
        { role: 'user', content: anonymizedText.sanitizedText },
      ];
    }
    else if (messages && messages.length > 0) {
      const { sanitizedMessages, anonymization } = anonymizeMessages(messages);
      const lastMessage = sanitizedMessages[sanitizedMessages.length - 1].content;
      inputAnonymizationResults.push({
        sanitizedText: '',
        findings: anonymization.findings,
        hasFindings: anonymization.hasFindings,
        findingTypes: anonymization.findingTypes,
      });

      if (lastMessage.toLowerCase().startsWith('malli:')) {
        finalMessages = [{ role: 'system', content: withPrivacyInstruction(applyProfile(SYSTEM_PROMPT_MALLI, userAiProfile, 'styleOnly')) }, ...sanitizedMessages];
      } else {
        finalMessages = [{ role: 'system', content: withPrivacyInstruction(applyProfile(withMainChatClinicalAudience(SYSTEM_PROMPT_MEDICAL), userAiProfile, 'full')) }, ...sanitizedMessages];
      }
    } else {
      return NextResponse.json({ error: 'Puuttuvat tiedot' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: CURRENT_MODEL,
      messages: finalMessages,
      temperature: 0,
    });

    const anonymization = mergeAnonymizationResults(inputAnonymizationResults);

    return NextResponse.json({
      content: response.choices[0].message.content,
      privacy: {
        anonymized: anonymization.hasFindings,
        findingTypes: anonymization.findingTypes,
      },
    });
  } catch (error: any) {
    console.error('AI Error:', error.message || error);
    return NextResponse.json({
      error: 'AI-palvelinvirhe',
      details: error.message,
    }, { status: 500 });
  }
}
