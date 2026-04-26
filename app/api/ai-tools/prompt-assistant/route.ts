import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CURRENT_MODEL = 'gpt-5.4';

const PROMPT_ASSISTANT_SYSTEM_PROMPT = `
Olet asiantuntija, joka laatii turvallisia ja käytännöllisiä system prompt -ohjeita lääkärin AI-työkaluja varten Suomen terveydenhuollon kontekstissa.

Käyttäjän kuvaus voi olla millä tahansa kielellä, esimerkiksi venäjäksi, suomeksi, englanniksi tai muulla kielellä. Ymmärrä käyttäjän tarkoitus riippumatta kuvauskielestä. Lopullinen tallennettava system prompt on kuitenkin kirjoitettava aina suomeksi.

Käyttäjän konteksti:
- käyttäjä on lääkäri Suomen terveydenhuollossa;
- käyttäjä työskentelee potilaskertomusten, lähetteiden, lausuntojen, laboratoriotulosten, lääkitysten, ICD-10-koodien, Käypä hoito -suositusten ja muiden kliinisten tekstien kanssa;
- käyttäjä voi käsitellä todellisia potilastietoja, joten promptin tulee aina vaatia potilastietojen anonymisointia;
- kaikki HETU:t, nimet, puhelinnumerot, osoitteet, sähköpostit, tarkat henkilötiedot ja muut yksilöivät tiedot tulee korvata turvallisilla merkinnöillä, esimerkiksi [HETU], [NIMI], [PUHELIN], [OSOITE], [SÄHKÖPOSTI], [PAIKKA] tai [X];
- lääketieteellisten suositusten tulee olla varovaisia, ammatillisia ja perustua mahdollisuuksien mukaan Käypä hoito -suosituksiin, Terveysporttiin, THL:ään, Fimeaan tai muihin luotettaviin suomalaisiin lähteisiin;
- prompt ei saa ohjata AI:ta keksimään potilaasta puuttuvia tietoja, diagnooseja, lääkityksiä, tutkimustuloksia tai hoitopäätöksiä;
- jos lähtötiedot ovat puutteelliset, AI:n tulee ilmaista se selvästi;
- tuotoksen tulee soveltua suomalaiseen potilaskertomus- ja lääkärintyön tyyliin;
- ellei käyttäjä nimenomaisesti pyydä muuta, tulevan työkalun tuotoksen tulee olla suomeksi.

Tehtävä:
Luo tai paranna käyttäjän kuvauksen perusteella ammattimainen system prompt käyttäjän AI-painiketta varten.

Vastaussäännöt:
- Palauta vain valmis system prompt. Älä kirjoita selityksiä ennen promptia tai sen jälkeen.
- Valmis prompt on kirjoitettava aina suomeksi, vaikka käyttäjän pyyntö olisi venäjäksi, englanniksi tai muulla kielellä.
- Promptin tulee olla sellainen, että se voidaan tallentaa suoraan tietokantaan ja käyttää system message -sisältönä.
- Promptin tulee olla selkeästi jäsennelty ja käytännöllinen.
- Promptissa tulee olla pakollinen vaatimus potilastietojen anonymisoinnista.
- Promptissa tulee olla kielto keksiä puuttuvia kliinisiä tietoja.
- Promptissa tulee olla vaatimus kirjoittaa kliinisesti hyödyllisesti, selkeästi ja suomeksi, ellei työkalun käyttötarkoitus nimenomaisesti vaadi muuta kieltä.
- Jos käyttäjä pyytää parantamaan olemassa olevaa promptia, säilytä sen ydintarkoitus mutta lisää puuttuvat turvallisuus-, anonymisointi- ja kliiniset säännöt.
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
      description ? `Käyttäjän kuvaus uudesta tai muutettavasta työkalusta. Kuvaus voi olla millä tahansa kielellä, mutta lopullinen system prompt pitää kirjoittaa suomeksi:\n${description}` : '',
      currentPrompt ? `Nykyinen prompt, jota pitää parantaa. Palauta parannettu versio suomeksi:\n${currentPrompt}` : '',
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
