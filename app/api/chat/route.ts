import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Используем стандартную версию 5.4, так как она наиболее универсальна
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
  
  // ОБНОВЛЕННЫЙ ПРОМПТ ДЛЯ LABRAT С ЛОГИЧЕСКОЙ ГРУППИРОВКОЙ
  labrat: `Ты — врач akuutti-/vuodeosasto в Финляндии.
Твоя задача — оформить лабораторные данные в строку для potilaskertomus, строго соблюдая логический порядок групп.

ПОРЯДОК ГРУППИРОВКИ (строго соблюдать):
1. Инфекция и ОАК: CRP, PVKT (Hb, Leik, Trom, Neut, и т.д.).
2. Сахар: Gluc.
3. Почки и электролиты: Krea, Na, K, Ca-albe.
4. Печень: AFOS, ALAT, ASAT, Bil, GT.
5. Сердце/Тромбозы: TNT, ProBNP, D-Dimer.
6. Остальное: всё, что не вошло в списки выше.

Критически важные правила:
- Выводи результат В ОДНУ СТРОКУ, показатели через запятую.
- Округляй значения до разумных (напр. CRP 12, а не 12.0).
- Сохраняй только сокращенные названия (CRP, Hb, Krea).
- НЕ указывай единицы измерения и референсные значения.
- НЕ используй символы * или спецсимволы.
- Если показатель пустой или pyydetty, полностью ИГНОРИРУЙ его.
- Никаких комментариев от себя, только итоговая строка.`
};

export async function POST(req: Request) {
  try {
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
    // 2. ВТОРОЙ ПРИОРИТЕТ: Текстовый инструментарий
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
