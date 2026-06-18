import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { getOpenAiClientForUser } from "../../../../../lib/ai/providers/getOpenAiClientForUser";
import { buildWorkspaceContextInstruction, getUserAiWorkspaceContext } from "../../../../../lib/ai/workspaceContext";
import { anonymizePatientText, mergeAnonymizationResults } from "../../../../../lib/privacy/anonymizePatientText";
import { preparePrivacyPayload } from "../../../../../lib/privacy/gateway";
import { hasCriticalPrivacyFindingTypes } from "../../../../../lib/privacy/gateway/decision";
import { sanitizeJsonValue } from "../../../../../lib/privacy/structured/sanitizeJsonValue";

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

function anonymizeJsonLikeValue(value: unknown) {
  return sanitizeJsonValue(value, {
    defaultMode: "clinicalBuilder",
    modeForPath(path) {
      const key = path[path.length - 1];
      if (key === "sourceLabel" || key === "type" || key === "processingMode") return null;
      return "clinicalBuilder";
    },
  });
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
    const materialSummaries = Array.isArray(body?.materialSummaries) ? body.materialSummaries : [];
    const sourceSummaries = Array.isArray(body?.sourceSummaries) ? body.sourceSummaries : [];
    const meta = body?.meta && typeof body.meta === "object" ? body.meta : {};

    if (materialSummaries.length === 0) return NextResponse.json({ error: "Yhteenvedot puuttuvat" }, { status: 400 });

    const topicGateway = preparePrivacyPayload([
      { key: "topic", value: topic, mode: "generalText" },
    ]);
    const anonymizedMaterialSummaries = anonymizeJsonLikeValue(materialSummaries);
    const anonymizedSourceSummaries = anonymizeJsonLikeValue(sourceSummaries);
    const anonymizedMeta = anonymizeJsonLikeValue(meta);
    const structuredGateway = preparePrivacyPayload([
      { key: "materialSummariesPayload", value: JSON.stringify(anonymizedMaterialSummaries.value), mode: "clinicalBuilder" },
      { key: "sourceSummariesPayload", value: JSON.stringify(anonymizedSourceSummaries.value), mode: "clinicalBuilder" },
      { key: "metaPayload", value: JSON.stringify(anonymizedMeta.value), mode: "clinicalBuilder" },
    ]);
    const anonymization = mergeAnonymizationResults([
      {
        sanitizedText: topicGateway.sanitized.topic ?? "",
        findings: [],
        hasFindings: topicGateway.privacy.anonymized,
        findingTypes: [...topicGateway.privacy.findingTypes, ...topicGateway.privacy.residualFindingTypes],
      },
      anonymizedMaterialSummaries.anonymization,
      anonymizedSourceSummaries.anonymization,
      anonymizedMeta.anonymization,
    ]);
    const privacyBlocked = topicGateway.privacy.blocked || structuredGateway.privacy.blocked;

    if (privacyBlocked) {
      return NextResponse.json({
        error: buildPrivacyBlockReply(),
        privacy: {
          anonymized: anonymization.hasFindings || structuredGateway.privacy.anonymized,
          findingTypes: Array.from(new Set([
            ...anonymization.findingTypes,
            ...structuredGateway.privacy.findingTypes,
            ...structuredGateway.privacy.residualFindingTypes,
          ])),
        },
        route: {
          blockedByPrivacyGate: true,
        },
      }, { status: 400 });
    }

    const payload = JSON.stringify({
      topic: topicGateway.sanitized.topic,
      materialSummaries: anonymizedMaterialSummaries.value,
      sourceSummaries: anonymizedSourceSummaries.value,
      meta: anonymizedMeta.value,
    });

    if (payload.length > MAX_SUMMARY_JSON_CHARS) {
      return NextResponse.json({ error: "Yhteenvetojen määrä on liian suuri. Jaa materiaali kahdeksi kortiksi." }, { status: 400 });
    }

    const systemPrompt = `
Olet dr.kapustin.fi-sivuston kliininen AI-editori.

${buildWorkspaceContextInstruction(workspaceContext, {
  contentLabel: "Pikaohje card content",
})}

Muodosta annetuista fragmenttikohtaisista kliinisistä poiminnoista lyhyt, käytännöllinen Pikaohje perusterveydenhuollon lääkärille valitun kliinisen maan kontekstissa.
Tämä EI ole oppimateriaali eikä luento.

TAVOITE:
- lääkäri avaa kortin vastaanotolla, tarkistaa asian nopeasti ja jatkaa työtä
- jätä vain kliinisesti hyödyllinen, toimintaa ohjaava sisältö
- kirjoita kliininen sisältö oletuksena työtilan kliinisellä vastauskielellä
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
  "title": "otsikko kliinisellä vastauskielellä",
  "slugSuggestion": "lyhyt-latin-slug",
  "description": "1 lyhyt virke kliinisellä vastauskielellä",
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

    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: payload },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    const parsed = tryParseJson(content);
    const sanitizedOutput = sanitizeJsonValue(parsed, {
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
    const outputPrivacy = preparePrivacyPayload([
      { key: "synthesizedCard", value: JSON.stringify(sanitizedOutput.value), mode: "persistentStorage" },
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
        privacy: {
          anonymized: anonymization.hasFindings || structuredGateway.privacy.anonymized,
          findingTypes: Array.from(new Set([
            ...anonymization.findingTypes,
            ...structuredGateway.privacy.findingTypes,
            ...structuredGateway.privacy.residualFindingTypes,
          ])),
        },
        route: {
          blockedByPrivacyGate: true,
          blockedByOutputPrivacyGate: true,
        },
      }, { status: 400 });
    }

    return NextResponse.json({
      ...(sanitizedOutput.value as Record<string, unknown>),
      meta: { ...(((sanitizedOutput.value as Record<string, unknown>).meta as Record<string, unknown>) || {}), processingMode: "client_chunked_two_pass", ...meta },
      privacy: {
        anonymized: anonymization.hasFindings || structuredGateway.privacy.anonymized,
        findingTypes: Array.from(new Set([
          ...anonymization.findingTypes,
          ...structuredGateway.privacy.findingTypes,
          ...structuredGateway.privacy.residualFindingTypes,
        ])),
      },
      route: {
        outputSanitized: sanitizedOutput.anonymization.hasFindings || outputPrivacy.privacy.anonymized,
      },
    });
  } catch (error: any) {
    console.error("pikaohjeet-v2 synthesize-clinical-card error:", error);
    return NextResponse.json({ error: "Pikaohjeen koostaminen epäonnistui", details: error?.message || "Unknown error" }, { status: 500 });
  }
}
