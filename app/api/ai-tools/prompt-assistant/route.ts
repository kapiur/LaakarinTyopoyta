import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { getOpenAiClientForUser } from '../../../../lib/ai/providers/getOpenAiClientForUser';
import { getUserAiWorkspaceContext } from '../../../../lib/ai/workspaceContext';
import { preparePrivacyPayload } from '../../../../lib/privacy/gateway';
import { hasCriticalPrivacyFindingTypes } from '../../../../lib/privacy/gateway/decision';

function buildPromptAssistantSystemPrompt(input: {
  uiLanguage: string;
  clinicalCountry: string;
  clinicalOutputLanguage: string;
}) {
  return `
Olet asiantuntija, joka laatii ja muokkaa turvallisia ja käytännöllisiä system prompt -ohjeita lääkärin AI-työkaluja varten.

Käyttäjän kuvaus voi olla millä tahansa kielellä, esimerkiksi venäjäksi, suomeksi, englanniksi, saksaksi tai muulla kielellä. Ymmärrä käyttäjän tarkoitus riippumatta kuvauskielestä.

Työtilan konteksti:
- käyttöliittymän kieli on ${input.uiLanguage};
- kliininen maa on ${input.clinicalCountry};
- kliininen vastauskieli on ${input.clinicalOutputLanguage};
- ellei käyttäjä nimenomaisesti pyydä muuta, luotavan AI-työkalun kliinisen lopputuotoksen tulee olla työtilan kliinisellä vastauskielellä;
- AI-työkalun kliinisen sisällön, lähdeviittausten ja työskentelylogiikan tulee oletuksena noudattaa valitun kliinisen maan kontekstia.

Käyttäjän konteksti:
- käyttäjä on lääkäri valitun kliinisen maan terveydenhuollossa;
- käyttäjä työskentelee potilaskertomusten, lähetteiden, lausuntojen, laboratoriotulosten, lääkitysten, ICD-10-koodien, Käypä hoito -suositusten ja muiden kliinisten tekstien kanssa;
- käyttäjä haluaa, että AI-työkalut säilyttävät mahdollisimman hyvin hänen oman kirjoitustyylinsä ja kliinisen ilmaisutapansa;
- käyttäjän teksteissä tulee mahdollisuuksien mukaan säilyttää sama lauserakenne, sanasto, terminologia, tekstin tiiviys, kappalejärjestys, otsikointi, kliininen rytmi ja niin sanottu kirjoittajan oma jälki;
- jos käyttäjä antaa lähtötekstin, AI:n tulee muokata sitä ensisijaisesti käyttäjän tyyliä säilyttäen, eikä korvata sitä geneerisellä tai toisenlaisella kirjoitustyylillä;
- käyttäjä voi käsitellä todellisia potilastietoja, joten promptin tulee aina vaatia potilastietojen anonymisointia;
- kaikki HETU:t, nimet, puhelinnumerot, osoitteet, sähköpostit, tarkat henkilötiedot ja muut yksilöivät tiedot tulee korvata turvallisilla merkinnöillä, esimerkiksi [HETU], [NIMI], [PUHELIN], [OSOITE], [SÄHKÖPOSTI], [PAIKKA] tai [X];
- lääketieteellisten suositusten tulee olla varovaisia, ammatillisia ja perustua mahdollisuuksien mukaan valitun kliinisen maan virallisiin ja luotettaviin lähteisiin;
- prompt ei saa ohjata AI:ta keksimään potilaasta puuttuvia tietoja, diagnooseja, lääkityksiä, tutkimustuloksia tai hoitopäätöksiä;
- jos lähtötiedot ovat puutteelliset, AI:n tulee ilmaista se selvästi;
- tuotoksen tulee soveltua valitun kliinisen maan potilaskertomus- ja lääkärintyön tyyliin;
- ellei käyttäjä nimenomaisesti pyydä muuta, tulevan työkalun tuotoksen tulee olla ${input.clinicalOutputLanguage}.

Tehtävä:
Luo uusi system prompt tai muokkaa olemassa olevaa system promptia käyttäjän kuvauksen perusteella. Noudata tarkasti erillistä toimintatilaa: CREATE_NEW_PROMPT tai EDIT_EXISTING_PROMPT.

Toimintatila CREATE_NEW_PROMPT:
- Käytä tätä vain, jos nykyistä promptia ei ole annettu tai se on tyhjä.
- Luo tällöin kokonainen, käyttövalmis system prompt käyttäjän kuvauksen perusteella.
- Rakenna prompt selkeästi ja lisää tarvittavat turvallisuus-, anonymisointi- ja kliiniset säännöt.

Toimintatila EDIT_EXISTING_PROMPT:
- Käytä tätä aina, jos nykyinen prompt on annettu.
- Nykyinen prompt on ensisijainen pohjateksti ja sen rakenne, tarkoitus, tyyli ja olemassa olevat säännöt pitää säilyttää.
- Älä kirjoita promptia alusta uudelleen.
- Älä korvaa nykyistä promptia kokonaan uudella versiolla.
- Tee vain käyttäjän ohjeen vaatimat muutokset, täydennykset tai tarkennukset.
- Lisää uudet ohjeet loogiseen kohtaan nykyistä promptia.
- Muuta olemassa olevaa sääntöä vain, jos käyttäjän uusi ohje selvästi koskee juuri sitä sääntöä tai on sen kanssa ristiriidassa.
- Poista olemassa olevia sääntöjä vain, jos käyttäjä nimenomaisesti pyytää poistamista.
- Säilytä työkalun alkuperäinen käyttötarkoitus, ellei käyttäjä nimenomaisesti pyydä muuttamaan sitä.
- Jos käyttäjän ohje on pieni lisäys, palautetun promptin tulee olla nykyinen prompt täydennettynä, ei kokonaan uudelleen jäsennelty prompt.

Vastaussäännöt:
- Palauta vain valmis system prompt. Älä kirjoita selityksiä ennen promptia tai sen jälkeen.
- Valmis prompt kirjoitetaan oletuksena käyttöliittymän kielellä (${input.uiLanguage}), ellei käyttäjä nimenomaisesti pyydä toista promptin kirjoituskieltä.
- Promptin tulee olla sellainen, että se voidaan tallentaa suoraan tietokantaan ja käyttää system message -sisältönä.
- Promptin tulee olla selkeästi jäsennelty ja käytännöllinen.
- Promptissa tulee olla pakollinen vaatimus potilastietojen anonymisoinnista.
- Promptissa tulee olla kielto keksiä puuttuvia kliinisiä tietoja.
- Promptissa tulee olla vaatimus säilyttää käyttäjän oma kirjoitustyyli mahdollisimman hyvin: lauserakenteet, sanavalinnat, kliininen sanasto, tekstin tiiviys, otsikointi, asioiden esittämisjärjestys ja käyttäjän tyypillinen potilaskertomustyyli.
- Promptissa tulee ohjeistaa, että AI korjaa ja jäsentää tekstiä vain siinä määrin kuin tehtävä vaatii, mutta ei saa tehdä tekstistä tarpeettoman geneeristä tai muuttaa kirjoittajan ääntä.
- Promptissa tulee olla vaatimus kirjoittaa kliinisesti hyödyllisesti, selkeästi ja oletuksena työtilan kliinisellä vastauskielellä (${input.clinicalOutputLanguage}), ellei työkalun käyttötarkoitus tai käyttäjän pyyntö nimenomaisesti vaadi muuta kieltä.
- Promptissa tulee oletuksena huomioida valitun kliinisen maan (${input.clinicalCountry}) konteksti, terminologia ja viralliset lähteet silloin, kun työkalu antaa kliinistä sisältöä.
- Jos käyttäjä pyytää parantamaan olemassa olevaa promptia, säilytä sen ydintarkoitus mutta lisää vain tarvittavat puuttuvat turvallisuus-, anonymisointi-, kirjoitustyylin säilyttämis- ja kliiniset säännöt.
`;
}

function buildPrivacyBlockReply() {
  return 'Tekstissä havaittiin tai siihen jäi automaattisen anonymisoinnin jälkeen tunnistetietoja, joita ei voida lähettää AI-käsittelyyn turvallisesti. Poista nimi-, yhteys-, tunniste- ja osoitetiedot ja yritä uudelleen.';
}

function buildPrivacyOutputBlockReply() {
  return 'AI-vastaus sisälsi henkilötietoihin viittaavia tietoja, joten sitä ei näytetä turvallisuussyistä. Muokkaa pyyntöä yleisemmäksi ilman tunnistetietoja ja yritä uudelleen.';
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = Number((session?.user as any)?.id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const workspaceContext = await getUserAiWorkspaceContext(userId);
    const { client, model } = await getOpenAiClientForUser(userId);

    const body = await req.json();
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const currentPrompt = typeof body.currentPrompt === 'string' ? body.currentPrompt.trim() : '';
    const mode = currentPrompt ? 'EDIT_EXISTING_PROMPT' : 'CREATE_NEW_PROMPT';

    if (!description && !currentPrompt) {
      return NextResponse.json({ error: 'description or currentPrompt is required' }, { status: 400 });
    }

    const inputPrivacy = preparePrivacyPayload([
      { key: 'description', value: description, mode: 'generalText' },
      { key: 'currentPrompt', value: currentPrompt, mode: 'persistentStorage' },
    ]);

    if (inputPrivacy.privacy.blocked) {
      return NextResponse.json({
        error: buildPrivacyBlockReply(),
        privacy: inputPrivacy.privacy,
        route: {
          blockedByPrivacyGate: true,
        },
      }, { status: 400 });
    }

    const userContent = [
      `Toimintatila: ${mode}`,
      inputPrivacy.sanitized.description
        ? `Käyttäjän ohje. Ohje voi olla millä tahansa kielellä. Palauta valmis system prompt oletuksena työtilan käyttöliittymän kielellä (${workspaceContext.uiLanguage}), ellei käyttäjä pyydä toista promptin kirjoituskieltä:\n${inputPrivacy.sanitized.description}`
        : 'Käyttäjä ei antanut erillistä muutosohjetta. Jos nykyinen prompt on annettu, tee vain varovainen turvallisuus- ja selkeysparannus säilyttäen nykyinen rakenne.',
      inputPrivacy.sanitized.currentPrompt
        ? `Nykyinen prompt. Tämä on ensisijainen pohjateksti. Säilytä sen rakenne, tarkoitus, tyyli ja olemassa olevat säännöt. Älä kirjoita sitä alusta uudelleen, vaan muuta vain käyttäjän ohjeen kannalta tarpeelliset kohdat:\n${inputPrivacy.sanitized.currentPrompt}`
        : '',
    ].filter(Boolean).join('\n\n');

    const response = await client.chat.completions.create({
      model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: buildPromptAssistantSystemPrompt({
            uiLanguage: workspaceContext.uiLanguage,
            clinicalCountry: workspaceContext.clinicalCountry,
            clinicalOutputLanguage: workspaceContext.clinicalOutputLanguage,
          }),
        },
        { role: 'user', content: userContent },
      ],
    });

    const outputPrivacy = preparePrivacyPayload([
      { key: 'prompt', value: response.choices[0].message.content, mode: 'persistentStorage' },
    ]);
    const safePrompt = outputPrivacy.sanitized.prompt ?? response.choices[0].message.content ?? '';

    if (
      outputPrivacy.privacy.blocked &&
      hasCriticalPrivacyFindingTypes([
        ...outputPrivacy.privacy.findingTypes,
        ...outputPrivacy.privacy.residualFindingTypes,
      ])
    ) {
      return NextResponse.json({
        error: buildPrivacyOutputBlockReply(),
        privacy: inputPrivacy.privacy,
        route: {
          blockedByPrivacyGate: true,
          blockedByOutputPrivacyGate: true,
        },
      }, { status: 400 });
    }

    return NextResponse.json({
      prompt: safePrompt,
      mode,
      privacy: inputPrivacy.privacy,
      route: {
        outputSanitized: outputPrivacy.privacy.anonymized,
      },
    });
  } catch (error: any) {
    console.error('Prompt assistant error:', error.message || error);
    return NextResponse.json({ error: 'Prompt assistant failed' }, { status: 500 });
  }
}
