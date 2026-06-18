import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { getOpenAiClientForUser } from "../../../../../lib/ai/providers/getOpenAiClientForUser";
import { buildWorkspaceContextInstruction, getUserAiWorkspaceContext } from "../../../../../lib/ai/workspaceContext";
import { preparePrivacyPayload } from "../../../../../lib/privacy/gateway";
import { hasCriticalPrivacyFindingTypes } from "../../../../../lib/privacy/gateway/decision";
import { sanitizeJsonValue } from "../../../../../lib/privacy/structured/sanitizeJsonValue";

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

function buildPrivacyBlockReply() {
  return "Tekstissä havaittiin tai siihen jäi automaattisen anonymisoinnin jälkeen tunnistetietoja, joita ei voida lähettää AI-käsittelyyn turvallisesti. Poista nimi-, yhteys-, tunniste- ja osoitetiedot ja yritä uudelleen.";
}

function buildPrivacyOutputBlockReply() {
  return "AI-vastaus sisälsi henkilötietoihin viittaavia tietoja, joten sitä ei näytetä turvallisuussyistä. Muokkaa pyyntöä yleisemmäksi ilman tunnistetietoja ja yritä uudelleen.";
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session?.user as any)?.id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspaceContext = await getUserAiWorkspaceContext(userId);
    const { client, model } = await getOpenAiClientForUser(userId);

    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const rawText = typeof body?.rawText === "string" ? body.rawText.trim() : "";

    if (!rawText) {
      return NextResponse.json({ error: "Teksti puuttuu" }, { status: 400 });
    }

    if (rawText.length > 12000) {
      return NextResponse.json({ error: "Teksti on liian pitkä tähän toimintoon" }, { status: 400 });
    }

    const inputPrivacy = preparePrivacyPayload([
      { key: "title", value: title, mode: "generalText" },
      { key: "rawText", value: rawText, mode: "clinicalTransform" },
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
Olet dr.kapustin.fi-sivuston AI-avustaja. Tehtäväsi on siistiä lääkärin oma muistilappu kliinisesti käyttökelpoiseen muotoon.

${buildWorkspaceContextInstruction(workspaceContext, {
  preserveExistingLanguage: true,
  contentLabel: "cleaned note content",
})}

TÄRKEÄT RAJOITUKSET:
- Tämä on käyttäjän OMA MUISTILAPPU, ei virallinen hoitosuositus.
- Älä väitä, että teksti on tarkistettu Käypä hoidosta.
- Älä lisää uusia lääketieteellisiä väitteitä, annoksia tai raja-arvoja, jos niitä ei ole lähtötekstissä.
- Korjaa kieli, rakenne ja luettavuus.
- Säilytä kliininen merkitys täsmälleen samana.
- Säilytä muistilapun kieli oletuksena ennallaan, ellei käyttäjä nimenomaisesti pyydä kielen vaihtoa.
- Poista selvä metateksti ja sekavat toistot, mutta älä muuta merkitystä.
- Jos huomaat väitteen, joka vaatii lähdetarkistuksen, lisää se warnings-listaan.

PALAUTA VAIN validi JSON tällä rakenteella:
{
  "title": "lyhyt otsikko muistilapun kielellä",
  "description": "1 virkkeen kuvaus muistilapun kielellä",
  "type": "PERSONAL",
  "status": "NEEDS_REVIEW",
  "visibility": "PRIVATE",
  "sourceStatus": "NOT_CHECKED",
  "tags": ["tag1", "tag2"],
  "sections": [
    { "key": "lyhyt_latinalainen_avain", "title": "Osion otsikko muistilapun kielellä", "content": "markdown-teksti muistilapun kielellä", "kind": "TEXT", "order": 10 }
  ],
  "warnings": ["lyhyt huomautus muistilapun kielellä tarvittaessa"]
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
            title: inputPrivacy.sanitized.title,
            rawText: inputPrivacy.sanitized.rawText,
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
        if (leaf === "type" || leaf === "status" || leaf === "visibility" || leaf === "sourceStatus" || leaf === "kind") {
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
    console.error("pikaohjeet-v2 clean-note error:", error);
    return NextResponse.json(
      { error: "AI-käsittely epäonnistui", details: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
