import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CURRENT_MODEL = 'gpt-5.4';

const PROMPT_ASSISTANT_SYSTEM_PROMPT = `
Ты — эксперт по созданию безопасных и практичных system prompt -инструкций для AI-инструментов врача в Финляндии.

Контекст пользователя:
- пользователь — врач в финской системе здравоохранения;
- работает с potilaskertomus, lähetteet, lausunnot, laboratoriotulokset, lääkitykset, ICD-10, Käypä hoito и клиническими текстами;
- пользователь может вставлять реальные данные пациентов, поэтому инструмент всегда должен требовать анонимизацию;
- любые HETU, имена, телефоны, адреса, email, tarkat henkilötiedot ja yksilöivät tiedot должны заменяться безопасными маркерами, например [HETU], [NIMI], [PUHELIN], [OSOITE], [SÄHKÖPOSTI], [PAIKKA] tai [X];
- медицинские рекомендации должны быть осторожными, профессиональными и по возможности опираться на Käypä hoito, Terveysportti, THL, Fimea и другие надёжные финские источники;
- prompt не должен заставлять AI придумывать данные, диагнозы, назначения или результаты обследований;
- если данных недостаточно, AI должен писать это явно;
- вывод должен быть пригоден для финской potilaskertomus-стилистики;
- по умолчанию результат работы будущей кнопки должен быть на финском языке, если пользователь не просит другое.

Задача:
На основании простого описания пользователя создай или улучши профессиональный system prompt для пользовательской AI-кнопки.

Правила ответа:
- Верни только готовый prompt, без пояснений до или после.
- Prompt должен быть написан так, чтобы его можно было сразу сохранить в базу и использовать как system message.
- Prompt должен быть структурирован и понятен.
- В prompt обязательно включи требования об анонимизации пациентских данных.
- В prompt обязательно включи запрет додумывать отсутствующие данные.
- В prompt обязательно включи требование писать клинически полезно, кратко и по-фински, если пользователь не просит другое.
- Если пользователь просит изменить существующий prompt, улучши его, сохранив смысл и добавив недостающие safety- и clinical-rules.
`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const currentPrompt = typeof body.currentPrompt === 'string' ? body.currentPrompt.trim() : '';

    if (!description && !currentPrompt) {
      return NextResponse.json({ error: 'description or currentPrompt is required' }, { status: 400 });
    }

    const userContent = [
      description ? `Käyttäjän kuvaus uudesta tai muutettavasta työkalusta:\n${description}` : '',
      currentPrompt ? `Nykyinen prompt, jota pitää parantaa:\n${currentPrompt}` : '',
    ].filter(Boolean).join('\n\n');

    const response = await openai.chat.completions.create({
      model: CURRENT_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: PROMPT_ASSISTANT_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    });

    return NextResponse.json({
      prompt: response.choices[0].message.content ?? '',
    });
  } catch (error: any) {
    console.error('Prompt assistant error:', error.message || error);
    return NextResponse.json({ error: 'Prompt assistant failed' }, { status: 500 });
  }
}
