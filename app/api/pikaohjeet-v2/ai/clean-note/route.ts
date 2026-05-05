import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { OpenAI } from "openai";
import { authOptions } from "../../../../../lib/auth";
import { anonymizePatientText, mergeAnonymizationResults } from "../../../../../lib/privacy/anonymizePatientText";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CURRENT_MODEL = "gpt-5.4";

function tryParseJson(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/```json\s*([\s\S]*?)```/i) || content.match(/```\s*([\s\S]*?)```/i);
    if (match?.[1]) return JSON.parse(match[1]);
    const first = content.indexOf("{");
    const last = content.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(content.slice(first, last + 1));
    throw new Error("AI response was not valid JSON");
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const rawText = typeof body?.rawText === "string" ? body.rawText.trim() : "";

    if (!rawText) {
      return NextResponse.json({ error: "Teksti puuttuu" }, { status: 400 });
    }

    if (rawText.length > 12000) {
      return NextResponse.json({ error: "Teksti on liian pitkä tähän toimintoon" }, { status: 400 });
    }

    const anonymizedTitle = anonymizePatientText(title);
    const anonymizedRawText = anonymizePatientText(rawText);
    const anonymization = mergeAnonymizationResults([anonymizedTitle, anonymizedRawText]);

    const systemPrompt = `
Olet dr.kapustin.fi-sivuston AI-avustaja. Tehtäväsi on siistiä lääkärin oma muistilappu kliinisesti käyttökelpoiseen muotoon.

TÄRKEÄT RAJOITUKSET:
- Tämä on käyttäjän OMA MUISTILAPPU, ei virallinen hoitosuositus.
- Älä väitä, että teksti on tarkistettu Käypä hoidosta.
- Älä lisää uusia lääketieteellisiä väitteitä, annoksia tai raja-arvoja, jos niitä ei ole lähtötekstissä.
- Korjaa kieli, rakenne ja luettavuus.
- Säilytä kliininen sisältö suomeksi.
- Poista selvä metateksti ja sekavat toistot, mutta älä muuta merkitystä.
- Jos huomaat väitteen, joka vaatii lähdetarkistuksen, lisää se warnings-listaan.

PALAUTA VAIN validi JSON tällä rakenteella:
{
  "title": "lyhyt otsikko suomeksi",
  "description": "1 virkkeen kuvaus suomeksi",
  "type": "PERSONAL",
  "status": "NEEDS_REVIEW",
  "visibility": "PRIVATE",
  "sourceStatus": "NOT_CHECKED",
  "tags": ["tag1", "tag2"],
  "sections": [
    { "key": "lyhyt_latinalainen_avain", "title": "Osion otsikko", "content": "markdown-teksti suomeksi", "kind": "TEXT", "order": 10 }
  ],
  "warnings": ["lyhyt huomautus tarvittaessa"]
}
`;

    const response = await openai.chat.completions.create({
      model: CURRENT_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            title: anonymizedTitle.sanitizedText,
            rawText: anonymizedRawText.sanitizedText,
          }),
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    const parsed = tryParseJson(content);

    return NextResponse.json({
      ...parsed,
      privacy: {
        anonymized: anonymization.hasFindings,
        findingTypes: anonymization.findingTypes,
      },
    });
  } catch (error: any) {
    console.error("pikaohjeet-v2 clean-note error:", error);
    return NextResponse.json(
      { error: "AI-käsittely epäonnistui", details: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
