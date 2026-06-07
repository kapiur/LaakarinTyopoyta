import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { getOpenAiClientForUser } from "../../../../../lib/ai/providers/getOpenAiClientForUser";
import { mergeAnonymizationResults } from "../../../../../lib/privacy/anonymizePatientText";
import { preparePrivacyPayload } from "../../../../../lib/privacy/gateway";
import { hasCriticalPrivacyFindingTypes } from "../../../../../lib/privacy/gateway/decision";
import { sanitizeJsonValue } from "../../../../../lib/privacy/structured/sanitizeJsonValue";

// Direct mode is used for normal short material. Large material uses a two-pass pipeline:
// 1) chunk-level extraction of actionable clinical points
// 2) final synthesis into a compact Pikaohje card
const DIRECT_MODE_MAX_CHARS = 30000;
const HARD_MATERIAL_MAX_CHARS = 240000;
const HARD_SOURCE_MAX_CHARS = 120000;
const CHUNK_TARGET_CHARS = 16000;
const CHUNK_OVERLAP_CHARS = 800;
const MAX_CHUNKS = 18;

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

function splitText(text: string, targetChars = CHUNK_TARGET_CHARS, overlapChars = CHUNK_OVERLAP_CHARS) {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length <= targetChars) return [clean];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    const hardEnd = Math.min(start + targetChars, clean.length);
    let end = hardEnd;

    if (hardEnd < clean.length) {
      const window = clean.slice(start, hardEnd);
      const paragraphBreak = window.lastIndexOf("\n\n");
      const sentenceBreak = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
      const softBreak = paragraphBreak > targetChars * 0.55 ? paragraphBreak : sentenceBreak > targetChars * 0.55 ? sentenceBreak + 1 : -1;
      if (softBreak > 0) end = start + softBreak;
    }

    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= clean.length) break;
    start = Math.max(0, end - overlapChars);
    if (chunks.length > MAX_CHUNKS) break;
  }

  return chunks.slice(0, MAX_CHUNKS);
}

function baseSystemPrompt() {
  return `
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
}

function buildPrivacyBlockReply() {
  return "Tekstissä havaittiin tai siihen jäi automaattisen anonymisoinnin jälkeen tunnistetietoja, joita ei voida lähettää AI-käsittelyyn turvallisesti. Poista nimi-, yhteys-, tunniste- ja osoitetiedot ja yritä uudelleen.";
}

function buildPrivacyOutputBlockReply() {
  return "AI-vastaus sisälsi henkilötietoihin viittaavia tietoja, joten sitä ei näytetä turvallisuussyistä. Muokkaa pyyntöä yleisemmäksi ilman tunnistetietoja ja yritä uudelleen.";
}

function sanitizeChunkSummaryValue(value: unknown) {
  return sanitizeJsonValue(value, {
    defaultMode: "storage",
    modeForPath(path) {
      const key = path[path.length - 1];
      if (key === "chunkIndex" || key === "topic") return null;
      return "storage";
    },
  });
}

function sanitizeClinicalCardValue(value: unknown) {
  return sanitizeJsonValue(value, {
    defaultMode: "storage",
    modeForPath(path) {
      const key = path[path.length - 1];
      if (
        key === "type" ||
        key === "status" ||
        key === "visibility" ||
        key === "sourceStatus" ||
        key === "kind" ||
        key === "verified" ||
        key === "processingMode"
      ) {
        return null;
      }
      return "storage";
    },
  });
}

async function createClinicalDraftDirect(
  params: { topic: string; rawText: string; sourceText: string },
  client: Awaited<ReturnType<typeof getOpenAiClientForUser>>["client"],
  model: string
) {
  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: baseSystemPrompt() },
      { role: "user", content: JSON.stringify(params) },
    ],
  });

  const content = response.choices[0]?.message?.content || "";
  return sanitizeClinicalCardValue(tryParseJson(content)).value;
}

async function extractChunkSummary(
  params: {
  topic: string;
  chunk: string;
  index: number;
  total: number;
  isSource: boolean;
},
  client: Awaited<ReturnType<typeof getOpenAiClientForUser>>["client"],
  model: string
) {
  const systemPrompt = `
Olet kliininen tekstin tiivistäjä. Poimi annetusta fragmentista vain asiat, joista on hyötyä Terveysasema-lääkärin nopeassa Pikaohjeessa.

Älä tee lopullista ohjekorttia. Älä kirjoita teoriaa. Älä keksi mitään.
Palauta tiivis suomenkielinen JSON:
{
  "chunkIndex": number,
  "topic": "aihe",
  "keyPoints": ["toiminnallinen kliininen pointti"],
  "criteria": ["raja-arvo/kriteeri jos fragmentissa on"],
  "actions": ["mitä lääkäri tekee"],
  "urgent": ["päivystys/lähete/hälytysmerkki"],
  "documentation": ["potilaskertomukseen sopiva fraasi tai sisältö"],
  "sources": ["mainittu lähde"],
  "uncertain": ["väite joka vaatii tarkistuksen"]
}
`;

  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(params) },
    ],
  });

  const content = response.choices[0]?.message?.content || "";
  return sanitizeChunkSummaryValue(tryParseJson(content)).value;
}

async function runInBatches<T, R>(items: T[], batchSize: number, fn: (item: T, index: number) => Promise<R>) {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((item, offset) => fn(item, i + offset)));
    results.push(...batchResults);
  }
  return results;
}

async function createClinicalDraftChunked(
  params: { topic: string; rawText: string; sourceText: string },
  client: Awaited<ReturnType<typeof getOpenAiClientForUser>>["client"],
  model: string
) {
  const materialChunks = splitText(params.rawText);
  const sourceChunks = params.sourceText ? splitText(params.sourceText, CHUNK_TARGET_CHARS, CHUNK_OVERLAP_CHARS) : [];

  const materialSummaries = await runInBatches(materialChunks, 3, (chunk, index) =>
    extractChunkSummary({ topic: params.topic, chunk, index: index + 1, total: materialChunks.length, isSource: false }, client, model)
  );

  const sourceSummaries = await runInBatches(sourceChunks, 3, (chunk, index) =>
    extractChunkSummary({ topic: params.topic, chunk, index: index + 1, total: sourceChunks.length, isSource: true }, client, model)
  );

  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: baseSystemPrompt() },
      {
        role: "user",
        content: JSON.stringify({
          topic: params.topic,
          processingMode: "chunked_two_pass",
          materialSummaryChunks: materialSummaries,
          sourceSummaryChunks: sourceSummaries,
          instruction: "Muodosta lopullinen kompakti Pikaohje vain näiden poimintojen perusteella. Yhdistä duplikaatit ja jätä oppimateriaali pois.",
        }),
      },
    ],
  });

  const content = response.choices[0]?.message?.content || "";
  const parsed = sanitizeClinicalCardValue(tryParseJson(content)).value as Record<string, unknown>;

  return {
    ...parsed,
    meta: {
      processingMode: "chunked_two_pass",
      materialChunks: materialChunks.length,
      sourceChunks: sourceChunks.length,
      originalMaterialChars: params.rawText.length,
      originalSourceChars: params.sourceText.length,
    },
  };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = Number((session?.user as any)?.id);
    if (!Number.isFinite(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { client, model } = await getOpenAiClientForUser(userId);

    const body = await req.json();
    const rawText = typeof body?.rawText === "string" ? body.rawText.trim() : "";
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    const sourceText = typeof body?.sourceText === "string" ? body.sourceText.trim() : "";

    if (!rawText) return NextResponse.json({ error: "Materiaali puuttuu" }, { status: 400 });
    if (rawText.length > HARD_MATERIAL_MAX_CHARS) {
      return NextResponse.json(
        { error: `Materiaali on liian pitkä. Enimmäispituus on ${HARD_MATERIAL_MAX_CHARS} merkkiä. Poista selvästi turhat osat tai jaa aineisto kahdeksi kortiksi.` },
        { status: 400 }
      );
    }
    if (sourceText.length > HARD_SOURCE_MAX_CHARS) {
      return NextResponse.json(
        { error: `Lähdeteksti on liian pitkä. Enimmäispituus on ${HARD_SOURCE_MAX_CHARS} merkkiä. Liitä vain olennaiset Käypä hoito -kohdat.` },
        { status: 400 }
      );
    }

    const inputPrivacy = preparePrivacyPayload([
      { key: "topic", value: topic, mode: "generalText" },
      { key: "rawText", value: rawText, mode: "clinicalBuilder" },
      { key: "sourceText", value: sourceText, mode: "clinicalBuilder" },
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

    const totalInputLength = inputPrivacy.sanitized.rawText.length + inputPrivacy.sanitized.sourceText.length;
    const parsed = (totalInputLength <= DIRECT_MODE_MAX_CHARS
      ? await createClinicalDraftDirect({
          topic: inputPrivacy.sanitized.topic,
          rawText: inputPrivacy.sanitized.rawText,
          sourceText: inputPrivacy.sanitized.sourceText,
        }, client, model)
      : await createClinicalDraftChunked({
          topic: inputPrivacy.sanitized.topic,
          rawText: inputPrivacy.sanitized.rawText,
          sourceText: inputPrivacy.sanitized.sourceText,
        }, client, model)) as Record<string, unknown>;
    const outputPrivacy = preparePrivacyPayload([
      { key: "card", value: JSON.stringify(parsed), mode: "persistentStorage" },
    ]);

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
      ...parsed,
      privacy: inputPrivacy.privacy,
      route: {
        outputSanitized: outputPrivacy.privacy.anonymized,
      },
    });
  } catch (error: any) {
    console.error("pikaohjeet-v2 create-clinical-card error:", error);
    return NextResponse.json({ error: "AI-käsittely epäonnistui", details: error?.message || "Unknown error" }, { status: 500 });
  }
}
