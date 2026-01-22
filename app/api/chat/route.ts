import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- СТАНДАРТНЫЕ ПРОМПТЫ ---
const SYSTEM_PROMPT_MALLI = `
Ты — эксперт по медицинской документации. Твоя задача — превратить текст реальной записи врача в интерактивный шаблон для системы «Lääkärin Työpöytä», максимально сохраняя индивидуальный стиль автора.
Правила:
1. Сохраняй авторское построение предложений и терминологию.
2. Используй синтаксис {{название}} для полей и {{название:select:вариант1,вариант2}} для списков.
`;

const SYSTEM_PROMPT_MEDICAL = `
Olet asiantunteva lääkärin avustaja. 
Tukeudu vastauksissasi virallisiin ja vahvistettuihin lääketieteellisiin lähteisiin.
Vastaa suomeksi, selkeästi ja ammattimaisesti. Mainitse lähde vastauksen lopussa.
`;

const PROMPTS_TOOLS: Record<string, string> = {
  fix: `Ты — эксперт по финской медицинской документации. Исправляй ошибки, анонимизируй данные [HETU]. Формат: Исправленный текст + раздел "Korjaukset:".`,
  translate: `Ты — медицинский переводчик. Переводи на профессиональный финский. Понимай транслитерацию. Анонимизируй всё через [X].`,
  summarize: `Ты — врач-эксперт. Сделай краткое медицинское резюме (Tiivistelmä) на финском. Структура: Esitiedot, Löydökset, Diagnoosi, Suunnitelma.`
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Извлекаем сообщения для чата ИЛИ текст/режим/кастомный промпт для инструментов
    const { messages, text, mode, customPrompt } = body;

    let finalMessages: any[] = [];

    // 1. ПРИОРИТЕТ: Кастомный промпт из Admin Prompt Lab
    if (customPrompt && text) {
      finalMessages = [
        { role: 'system', content: customPrompt },
        { role: 'user', content: text }
      ];
    } 
    // 2. ВТОРОЙ ПРИОРИТЕТ: Текстовый инструментарий (Fix/Translate/Summarize)
    else if (text && mode && PROMPTS_TOOLS[mode]) {
      finalMessages = [
        { role: 'system', content: PROMPTS_TOOLS[mode] },
        { role: 'user', content: text }
      ];
    } 
    // 3. ТРЕТИЙ ПРИОРИТЕТ: Стандартный чат
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
      model: 'gpt-4o', // Оставляем 4o для высокой точности
      messages: finalMessages,
      temperature: 0.2, // Низкая температура для минимизации галлюцинаций
    });

    return NextResponse.json({ content: response.choices[0].message.content });
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: 'AI-palvelinvirhe' }, { status: 500 });
  }
}
