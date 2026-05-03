import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { OpenAI } from "openai";
import { authOptions } from "../../../../../lib/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CURRENT_MODEL = "gpt-5.4";

function tryParseJson(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const fenced = content.match(/```json\s*([\s\S]*?)```/i) || content.match(/```\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1]);
    const first = content.indexOf("{");
    const last = content.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(content.slice(first, last + 1));
    throw new Error("AI response was not valid JSON");
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const rawText = typeof body?.rawText === "string" ? body.rawText.trim() : "";
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    const sourceText = typeof body?.sourceText === "string" ? body.sourceText.trim() : "";

    if (!rawText) return NextResponse.json({ error: "Materiaali puuttuu" }, { status: 400 });
    if (rawText.length > 30000) return NextResponse.json({ error: "Materiaali on liian pitkä" }, { status: 400 });

    const systemPrompt = `
Olet dr.kapustin.fi-sivuston kliininen AI-editori.

Tehtävä: muodosta pitkästä materiaalista lyhyt, käytännöllinen Pikaohje perusterveydenhuollon lääkärille (Terveysasema). Tämä EI ole oppimateriaali eikä luento.

TAVOITE:
- lääkäri avaa kortin vastaanotolla, tarkistaa asian nopeasti ja jatkaa työtä
- jätä vain kliinisesti hyödyllinen, toimintaa ohjaava sisältö
- clinical content aina suomeksi
- älä lisää pitkiä teoriaosuuksia
- älä keksi lähteitä
- jos Käypä hoito -tekstiä tai muuta lähdetekstiä ei ole annettu, merkitse sourceStatus = "NEEDS_REVIEW"
- jos lähdeteksti on annettu, käytä sitä ensisijaisesti ja merkitse vain annettuun lähteeseen perustuvat väitteet varmistetuiksi
- jos jokin väite vaatii tarkistuksen, lisää warnings-listaan

RAKENNE:
Kortissa tulisi yleensä olla osiot:
1. Käyttötilanne
2. Tarkista heti
3. Keskeiset kriteerit
4. Toimi näin
5. Milloin päivystykseen / lähete
6. Potilaskertomukseen
7. Lähteet

PALAUTA VAIN validi JSON:
{
  "title": "otsikko suomeksi",
  "slugSuggestion": "lyhyt-latin-slug",
  "description": "1 lyhyt virke suomeksi",
  "type": "CLINICAL",
  "status": "NEEDS_REVIEW",
  "visibility": "PUBLIC",
  "sourceStatus": "NEEDS_REVIEW",
  "environment": "terveysasema",
  "audience": "aikuinen",
  "tags": ["tag1", "tag2"],
  "sections": [
    { "key": "kayttotilanne", "title": "Käyttötilanne", "content": "markdown-teksti", "kind": "TEXT", "order": 10 }
  ],
  "fields": [],
  "rules": [],
  "sources": [
    { "title": "lähteen nimi jos annettu", "url": "", "type": "KAYPA_HOITO|LOCAL|OTHER", "verified": false }
  ],
  "warnings": ["lyhyt huomautus"]
}
`;

    const response = await openai.chat.completions.create({
      model: CURRENT_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({ topic, rawText, sourceText }) },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    const parsed = tryParseJson(content);
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("pikaohjeet-v2 create-clinical-card error:", error);
    return NextResponse.json({ error: "AI-käsittely epäonnistui", details: error?.message || "Unknown error" }, { status: 500 });
  }
}
