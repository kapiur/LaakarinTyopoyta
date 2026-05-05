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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Используем стандартную версию 5.4, так как она наиболее универсальна
const CURRENT_MODEL = 'gpt-5.4';

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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number((session?.user as any)?.id);

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { messages, text, mode, customPrompt } = body;

    let finalMessages: any[] = [];

    // 1. ПРИОРИТЕТ: Кастомный промпт
    if (customPrompt && text) {
      finalMessages = [
        { role: 'system', content: customPrompt },
        { role: 'user', content: text }
      ];
    }
    // 2. ВТОРОЙ ПРИОРИТЕТ: Стандартный текстовый инструментарий
    else if (text && mode && DEFAULT_AI_TOOL_PROMPTS[mode as keyof typeof DEFAULT_AI_TOOL_PROMPTS]) {
      finalMessages = [
        { role: 'system', content: DEFAULT_AI_TOOL_PROMPTS[mode as keyof typeof DEFAULT_AI_TOOL_PROMPTS] },
        { role: 'user', content: text }
      ];
    }
    // 3. ТРЕТИЙ ПРИОРИТЕТ: Пользовательский AI-инструмент из базы
    else if (text && mode) {
      const userToolPrompt = await getUserToolPrompt(mode, userId);

      if (!userToolPrompt) {
        return NextResponse.json({ error: 'AI-työkalua ei löytynyt' }, { status: 404 });
      }

      finalMessages = [
        { role: 'system', content: userToolPrompt },
        { role: 'user', content: text }
      ];
    }
    // 4. ЧЕТВЕРТЫЙ ПРИОРИТЕТ: Стандартный чат
    else if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1].content;

      if (lastMessage.toLowerCase().startsWith('malli:')) {
        finalMessages = [{ role: 'system', content: SYSTEM_PROMPT_MALLI }, ...messages];
      } else {
        finalMessages = [{ role: 'system', content: SYSTEM_PROMPT_MEDICAL }, ...messages];
      }
    } else {
      return NextResponse.json({ error: 'Puuttuvat tiedot' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: CURRENT_MODEL,
      messages: finalMessages,
      temperature: 0, // Установил 0 для максимальной точности в лабах
    });

    return NextResponse.json({ content: response.choices[0].message.content });
  } catch (error: any) {
    console.error("AI Error:", error.message || error);
    return NextResponse.json({
      error: 'AI-palvelinvirhe',
      details: error.message
    }, { status: 500 });
  }
}
