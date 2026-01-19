import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 1. Промпт для генерации шаблонов (существующий)
const SYSTEM_PROMPT_MALLI = `
Ты — эксперт по медицинской документации. Твоя задача — превратить текст реальной записи врача в интерактивный шаблон для системы «Lääkärin Työpöytä», максимально сохраняя индивидуальный стиль автора.
Правила:
1. Сохраняй авторское построение предложений и терминологию.
2. Используй синтаксис {{название}} для полей и {{название:select:вариант1,вариант2}} для списков.
3. Пояснительный текст оставляй СНАРУЖИ скобок.
`;

// 2. Промпт для медицинских консультаций (существующий)
const SYSTEM_PROMPT_MEDICAL = `
Olet asiantunteva lääkärin avustaja. 
Velvoitteesi:
1. Tukeudu vastauksissasi yksinomaan virallisiin ja vahvistettuihin lääketieteellisiin lähteisiin (Terveyskirjasto, Käypä hoito).
2. Sinun TÄYTYY mainita lähde vastauksen lopussa.
3. Vastaa suomeksi, selkeästi ja ammattimaisesti.
`;

// 3. НОВЫЕ ПРОМПТЫ ДЛЯ ТЕКСТОВОГО ИНСТРУМЕНТАРИЯ
const PROMPTS_TOOLS: Record<string, string> = {
  fix: `Ты — эксперт по финской медицинской документации. 
        Задача: исправить ошибки в тексте (грамотность, падежи, мед. термины).
        ПРАВИЛО АНОНИМИЗАЦИИ: Заменяй любые имена, даты рождения и HETU на [NIMI] или [HETU].
        1. Сохраняй авторский стиль и ритм. 
        2. Исправляй только ошибки.
        3. Формат: Исправленный текст, затем раздел "Korjaukset:" с кратким списком правок.`,

  translate: `Ты — медицинский переводчик. Переведи текст на финский язык.
              ПРАВИЛО АНОНИМИЗАЦИИ: Заменяй все персональные данные на [X].
              Используй профессиональный финский медицинский лексикон и сохраняй структуру (Anamneesi, Status, jne).`,

  summarize: `Ты — врач-эксперт. Сделай краткое медицинское резюме (Tiivistelmä) на финском.
              ПРАВИЛО АНОНИМИЗАЦИИ: Удали все личные данные.
              Структура: Esitiedot, Löydökset, Diagnoosi/Arvio, Suunnitelma. Стиль лаконичный.`
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, text, mode } = body;

    let finalMessages = [];

    // ЛОГИКА ОПРЕДЕЛЕНИЯ ЗАДАЧИ
    if (text && mode && PROMPTS_TOOLS[mode]) {
      // Работает новый инструмент (Fix/Translate/Summarize)
      finalMessages = [
        { role: 'system', content: PROMPTS_TOOLS[mode] },
        { role: 'user', content: text }
      ];
    } else if (messages) {
      // Работает стандартный чат (Malli или Консультация)
      const lastMessage = messages[messages.length - 1].content;
      
      if (lastMessage.toLowerCase().startsWith('malli:')) {
        finalMessages = [{ role: 'system', content: SYSTEM_PROMPT_MALLI }, ...messages];
      } else {
        finalMessages = [{ role: 'system', content: SYSTEM_PROMPT_MEDICAL }, ...messages];
      }
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Обновлено для точности исправления текстов
      messages: finalMessages,
      temperature: 0.2,
    });

    return NextResponse.json({ content: response.choices[0].message.content });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: 'AI-palvelinvirhe' }, { status: 500 });
  }
}
