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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Используем стандартную версию 5.4, так как она наиболее универсальна
const CURRENT_MODEL = 'gpt-5.4';

const PRIVACY_PLACEHOLDER_SYSTEM_PROMPT = `
Privacy placeholders such as [NAME], [HETU], [DATE_OF_BIRTH], [PHONE], [EMAIL], [ADDRESS], [PATIENT_ID], [PROFESSIONAL_NAME] and similar bracketed markers are internal server-side privacy markers.
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

async function getUserToolPrompt(mode: string, userId: number) {
  const tool = await prisma.aiTool.findFirst({
    where: {
      key: mode,
      userId,
      scope: 'USER',
      isActive: true,
    },
    select: {
      prompt: true,
    },
  });

  return tool?.prompt ?? null;
}

function anonymizeMessages(messages: any[]) {
  const anonymizationResults: ReturnType<typeof anonymizePatientText>[] = [];

  const sanitizedMessages = messages.map((message) => {
    if (!message || typeof message.content !== 'string') return message;

    const result = anonymizePatientText(message.content);
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

    const anonymizedText = anonymizePatientText(text);
    inputAnonymizationResults.push(anonymizedText);

    const anonymizedCustomPrompt = anonymizePatientText(customPrompt);
    inputAnonymizationResults.push(anonymizedCustomPrompt);

    let finalMessages: any[] = [];

    // 1. ПРИОРИТЕТ: Кастомный промпт
    if (customPrompt && text) {
      finalMessages = [
        { role: 'system', content: withPrivacyInstruction(anonymizedCustomPrompt.sanitizedText) },
        { role: 'user', content: anonymizedText.sanitizedText },
      ];
    }
    // 2. ВТОРОЙ ПРИОРИТЕТ: Стандартный текстовый инструментарий
    else if (text && mode && DEFAULT_AI_TOOL_PROMPTS[mode as keyof typeof DEFAULT_AI_TOOL_PROMPTS]) {
      finalMessages = [
        { role: 'system', content: withPrivacyInstruction(DEFAULT_AI_TOOL_PROMPTS[mode as keyof typeof DEFAULT_AI_TOOL_PROMPTS]) },
        { role: 'user', content: anonymizedText.sanitizedText },
      ];
    }
    // 3. ТРЕТИЙ ПРИОРИТЕТ: Пользовательский AI-инструмент из базы
    else if (text && mode) {
      const userToolPrompt = await getUserToolPrompt(mode, userId);

      if (!userToolPrompt) {
        return NextResponse.json({ error: 'AI-työkalua ei löytynyt' }, { status: 404 });
      }

      finalMessages = [
        { role: 'system', content: withPrivacyInstruction(userToolPrompt) },
        { role: 'user', content: anonymizedText.sanitizedText },
      ];
    }
    // 4. ЧЕТВЕРТЫЙ ПРИОРИТЕТ: Стандартный чат
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
        finalMessages = [{ role: 'system', content: withPrivacyInstruction(SYSTEM_PROMPT_MALLI) }, ...sanitizedMessages];
      } else {
        finalMessages = [{ role: 'system', content: withPrivacyInstruction(withMainChatClinicalAudience(SYSTEM_PROMPT_MEDICAL)) }, ...sanitizedMessages];
      }
    } else {
      return NextResponse.json({ error: 'Puuttuvat tiedot' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: CURRENT_MODEL,
      messages: finalMessages,
      temperature: 0, // Установил 0 для максимальной точности в лабах
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
