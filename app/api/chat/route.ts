import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Тот самый промпт для сохранения стиля
const SYSTEM_PROMPT_MALLI = `
Ты — эксперт по медицинской документации. Твоя задача — превратить текст реальной записи врача в интерактивный шаблон для системы «Lääkärin Työpöytä», максимально сохраняя индивидуальный стиль автора.

Критически важные правила:
1. Сохранение «почерка»: Не пытайся «улучшить» текст. Сохраняй авторское построение предложений, сокращения, специфические термины и структуру.
2. Интерактивность через {{...}}:
   - Текстовые поля: {{название_поля}}
   - Выпадающие списки: {{название:select:вариант1,вариант2}}
3. Синтаксис: Названия полей пиши на финском. Пояснительный текст оставляй неизменным СНАРУЖИ скобок.
Грамматически согласовывай варианты в списках с контекстом предложения.
`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    let finalMessages = [...messages];

    // ПРОВЕРКА: Если сообщение начинается с "Malli:", добавляем инструкции
    if (lastMessage.toLowerCase().startsWith('malli:')) {
      finalMessages = [
        { role: 'system', content: SYSTEM_PROMPT_MALLI },
        ...messages
      ];
    } else {
      // Обычный системный промпт для обычного чата
      finalMessages = [
        { role: 'system', content: 'Olet lääkärin avustaja. Vastaa lyhyesti ja asiallisesti.' },
        ...messages
      ];
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // или gpt-4
      messages: finalMessages,
      temperature: 0.3, // Низкая температура для точности
    });

    return NextResponse.json({ content: response.choices[0].message.content });
  } catch (error) {
    return NextResponse.json({ error: 'AI Error' }, { status: 500 });
  }
}
