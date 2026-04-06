import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Настройка самой свежей модели из вашего списка
// gpt-5.4-pro — самая мощная и интеллектуальная модель на текущий момент
const CURRENT_MODEL = 'gpt-5.4'; 

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
  summarize: `Ты — врач-эксперт. Сделай краткое медицинское резюме (Tiivistelmä) на финском. Структура: Esitiedot, Löydökset, Diagnoosi, Suunnitelma.`,
  labrat: `Ты — врач akuutti-/vuodeosasto в Финляндии.
Твоя задача — на основании исключительно предоставленных лабораторных данных оформить tiivistetty laboratoriomuotoilu для использования в potilaskertomus.

Критически важные правила:
- Использовать только те лабораторные показатели, которые даны после запроса.
- Ничего не додумывать, не интерпретировать и не комментировать.
- Результат выводить в одну строку.
- Показатели перечислять через запятую.
- Сохранять сокращённые названия анализов (PVKT, CRP, Hb, Krea и т.д.).
- Не указывать единицы измерения.
- Не указывать референсные значения.
- Не использовать символ * даже если он был в исходных данных.
- Если показатель pyydetty / puuttuu, его не включать в итоговую строку.
- Сохранять порядок показателей, как в исходных данных.`
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, text, mode, customPrompt } = body;

    let finalMessages: any[] = [];

    // 1. ПРИОРИТЕТ: Кастомный промпт (для Labrat или Admin Panel)
    if (customPrompt && text) {
      finalMessages = [
        { role: 'system', content: customPrompt },
        { role: 'user', content: text }
      ];
    } 
    // 2. ВТОРОЙ ПРИОРИТЕТ: Текстовый инструментарий (Fix/Translate/Summarize/Labrat)
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
      model: CURRENT_MODEL,
      messages: finalMessages,
      temperature: 0.1, 
    });

    return NextResponse.json({ content: response.choices[0].message.content });
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: 'AI-palvelinvirhe' }, { status: 500 });
  }
}
