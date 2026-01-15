import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Промпт для генерации шаблонов с сохранением стиля
const SYSTEM_PROMPT_MALLI = `
Ты — эксперт по медицинской документации. Твоя задача — превратить текст реальной записи врача в интерактивный шаблон для системы «Lääkärin Työpöytä», максимально сохраняя индивидуальный стиль автора.
Правила:
1. Сохраняй авторское построение предложений и терминологию.
2. Используй синтаксис {{название}} для полей и {{название:select:вариант1,вариант2}} для списков.
3. Пояснительный текст оставляй СНАРУЖИ скобок.
`;

// Промпт для медицинских консультаций с опорой на источники
const SYSTEM_PROMPT_MEDICAL = `
Olet asiantunteva lääkärin avustaja. 
Velvoitteesi:
1. Tukeudu vastauksissasi yksinomaan virallisiin ja vahvistettuihin lääketieteellisiin lähteisiin, kuten www.terveyskirjasto.fi (Duodecim), Käypä hoito -suositukset tai vastaavat luotettavat lähteet.
2. Sinun TÄYTYY mainita käytetty lähde jokaisen lääketieteellisen vastauksen lopussa (esim. "Lähde: Terveyskirjasto.fi").
3. Jos et löydä vahvistettua tietoa, ilmoita siitä rehellisesti. 
4. Vastaa suomeksi, selkeästi ja ammattimaisesti.
`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    let finalMessages = [...messages];

    // Выбор системного промпта в зависимости от запроса
    if (lastMessage.toLowerCase().startsWith('malli:')) {
      finalMessages = [
        { role: 'system', content: SYSTEM_PROMPT_MALLI },
        ...messages
      ];
    } else {
      finalMessages = [
        { role: 'system', content: SYSTEM_PROMPT_MEDICAL },
        ...messages
      ];
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Рекомендуется gpt-4 для более точного следования источникам
      messages: finalMessages,
      temperature: 0.2, // Минимальная температура для исключения галлюцинаций
    });

    return NextResponse.json({ content: response.choices[0].message.content });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: 'AI-palvelinvirhe' }, { status: 500 });
  }
}
