import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { OpenAI } from "openai";
import { authOptions } from "../../../../../lib/auth";
import { anonymizePatientText, mergeAnonymizationResults } from "../../../../../lib/privacy/anonymizePatientText";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CURRENT_MODEL = "gpt-5.4";
const MAX_SUMMARY_JSON_CHARS = 160000;

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

function anonymizeJsonLikeValue(value: unknown): { value: unknown; anonymization: ReturnType<typeof anonymizePatientText> } {
  if (typeof value === "string") {
    const result = anonymizePatientText(value);
    return { value: result.sanitizedText, anonymization: result };
  }

  const serialized = JSON.stringify(value ?? null);
  const result = anonymizePatientText(serialized);

  try {
    return { value: JSON.parse(result.sanitizedText), anonymization: result };
  } catch {
    return { value: result.sanitizedText, anonymization: result };
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    const materialSummaries = Array.isArray(body?.materialSummaries) ? body.materialSummaries : [];
    const sourceSummaries = Array.isArray(body?.sourceSummaries) ? body.sourceSummaries : [];
    const meta = body?.meta && typeof body.meta === "object" ? body.meta : {};

    if (materialSummaries.length === 0) return NextResponse.json({ error: "Yhteenvedot puuttuvat" }, { status: 400 });

    const anonymizedTopic = anonymizePatientText(topic);
    const anonymizedMaterialSummaries = anonymizeJsonLikeValue(materialSummaries);
    const anonymizedSourceSummaries = anonymizeJsonLikeValue(sourceSummaries);
    const anonymizedMeta = anonymizeJsonLikeValue(meta);
    const anonymization = mergeAnonymizationResults([
      anonymizedTopic,
      anonymizedMaterialSummaries.anonymization,
      anonymizedSourceSummaries.anonymization,
      anonymizedMeta.anonymization,
    ]);

    const payload = JSON.stringify({
      topic: anonymizedTopic.sanitizedText,
      materialSummaries: anonymizedMaterialSummaries.value,
      sourceSummaries: anonymizedSourceSummaries.value,
      meta: anonymizedMeta.value,
    });

    if (payload.length > MAX_SUMMARY_JSON_CHARS) {
      return NextResponse.json({ error: "Yhteenvetojen määrä on liian suuri. Jaa materiaali kahdeksi kortiksi." }, { status: 400 });
    }

    const systemPrompt = `
Olet dr.kapustin.fi-sivuston kliininen AI-editori.

Muodosta annetuista fragmenttikohtaisista kliinisistä poiminnoista lyhyt, käytännöllinen Pikaohje perusterveydenhuollon lääkärille (Terveysasema).
Tämä EI ole oppimateriaali eikä luento.

TAVOITE:
- lääkäri avaa kortin vastaanotolla, tarkistaa asian nopeasti ja jatkaa työtä
- jätä vain kliinisesti hyödyllinen, toimintaa ohjaava sisältö
- clinical content aina suomeksi
- yhdistä duplikaatit
- älä lisää pitkiä teoriaosuuksia
- älä keksi lähteitä tai väitteitä
- jos Käypä hoito -lähdettä ei ole mukana, sourceStatus = "NEEDS_REVIEW"
- jos jokin väite vaatii tarkistuksen, lisää warnings-listaan

RAKENNE:
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
  "warnings": ["lyhyt huomautus"],
  "meta": { "processingMode": "client_chunked_two_pass" }
}
`;

    const response = await openai.chat.completions.create({
      model: CURRENT_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: payload },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    const parsed = tryParseJson(content);
    return NextResponse.json({
      ...parsed,
      meta: { ...(parsed.meta || {}), processingMode: "client_chunked_two_pass", ...meta },
      privacy: {
        anonymized: anonymization.hasFindings,
        findingTypes: anonymization.findingTypes,
      },
    });
  } catch (error: any) {
    console.error("pikaohjeet-v2 synthesize-clinical-card error:", error);
    return NextResponse.json({ error: "Pikaohjeen koostaminen epäonnistui", details: error?.message || "Unknown error" }, { status: 500 });
  }
}
