import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { getOpenAiClientForUser } from "../../../../../lib/ai/providers/getOpenAiClientForUser";
import { buildWorkspaceContextInstruction, getUserAiWorkspaceContext } from "../../../../../lib/ai/workspaceContext";
import { preparePrivacyPayload } from "../../../../../lib/privacy/gateway";
import { hasCriticalPrivacyFindingTypes } from "../../../../../lib/privacy/gateway/decision";
import { sanitizeJsonValue } from "../../../../../lib/privacy/structured/sanitizeJsonValue";

const MAX_CHUNK_CHARS = 22000;

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

function buildPrivacyBlockReply() {
  return "Tekstissä havaittiin tai siihen jäi automaattisen anonymisoinnin jälkeen tunnistetietoja, joita ei voida lähettää AI-käsittelyyn turvallisesti. Poista nimi-, yhteys-, tunniste- ja osoitetiedot ja yritä uudelleen.";
}

function buildPrivacyOutputBlockReply() {
  return "AI-vastaus sisälsi henkilötietoihin viittaavia tietoja, joten sitä ei näytetä turvallisuussyistä. Muokkaa pyyntöä yleisemmäksi ilman tunnistetietoja ja yritä uudelleen.";
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = Number((session?.user as any)?.id);
    if (!Number.isFinite(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceContext = await getUserAiWorkspaceContext(userId);
    const { client, model } = await getOpenAiClientForUser(userId);

    const body = await req.json();
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    const chunk = typeof body?.chunk === "string" ? body.chunk.trim() : "";
    const index = Number.isFinite(Number(body?.index)) ? Number(body.index) : 1;
    const total = Number.isFinite(Number(body?.total)) ? Number(body.total) : 1;
    const isSource = Boolean(body?.isSource);

    if (!chunk) return NextResponse.json({ error: "Fragmentti puuttuu" }, { status: 400 });
    if (chunk.length > MAX_CHUNK_CHARS) {
      return NextResponse.json({ error: `Fragmentti on liian pitkä. Enimmäispituus on ${MAX_CHUNK_CHARS} merkkiä.` }, { status: 400 });
    }

    const inputPrivacy = preparePrivacyPayload([
      { key: "topic", value: topic, mode: "generalText" },
      { key: "chunk", value: chunk, mode: "clinicalBuilder" },
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

    const systemPrompt = `
${buildWorkspaceContextInstruction(workspaceContext, {
  contentLabel: "Pikaohje chunk summary",
})}

Olet kliininen tekstin tiivistäjä. Poimi annetusta fragmentista vain asiat, joista on hyötyä perusterveydenhuollon lääkärin nopeassa Pikaohjeessa valitun kliinisen maan kontekstissa.

Älä tee lopullista ohjekorttia. Älä kirjoita teoriaa. Älä keksi mitään. Säilytä vain toiminnallinen kliininen sisältö.
Palauta tiivis JSON työtilan kliinisellä vastauskielellä:
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
        {
          role: "user",
          content: JSON.stringify({
            topic: inputPrivacy.sanitized.topic,
            chunk: inputPrivacy.sanitized.chunk,
            index,
            total,
            isSource,
          }),
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    const parsed = tryParseJson(content);
    const sanitizedOutput = sanitizeJsonValue(parsed, {
      defaultMode: "storage",
      modeForPath: (path) => {
        const leaf = path[path.length - 1];
        if (leaf === "chunkIndex") {
          return null;
        }
        return "storage";
      },
    });
    const outputPrivacy = preparePrivacyPayload([
      { key: "output", value: JSON.stringify(sanitizedOutput.value), mode: "persistentStorage" },
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
      ...(sanitizedOutput.value as Record<string, unknown>),
      privacy: inputPrivacy.privacy,
      route: {
        outputSanitized: sanitizedOutput.anonymization.hasFindings || outputPrivacy.privacy.anonymized,
      },
    });
  } catch (error: any) {
    console.error("pikaohjeet-v2 extract-clinical-chunk error:", error);
    return NextResponse.json({ error: "Fragmentin AI-käsittely epäonnistui", details: error?.message || "Unknown error" }, { status: 500 });
  }
}
