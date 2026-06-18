import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { getOpenAiClientForUser } from '../../../../../lib/ai/providers/getOpenAiClientForUser';
import { getUserAiWorkspaceContext } from '../../../../../lib/ai/workspaceContext';
import { prisma } from '../../../../../lib/prisma';
import { anonymizePatientText } from '../../../../../lib/privacy/anonymizePatientText';
import { preparePrivacyPayload } from '../../../../../lib/privacy/gateway';
import { hasCriticalPrivacyFindingTypes } from '../../../../../lib/privacy/gateway/decision';
import { sanitizeJsonValue } from '../../../../../lib/privacy/structured/sanitizeJsonValue';

const DEFAULT_RECENT_SAMPLE_LIMIT = 5;
const MAX_SAVED_PROFILE_SAMPLES = 12;
const MAX_STORED_SAMPLE_CHARS = 4000;
const MAX_STORED_STYLE_SUMMARY_CHARS = 1200;

type ProfileRow = {
  id: string;
  styleSummary: string | null;
  writingStyle: string | null;
  preferredStructure: string | null;
  detailLevel: string | null;
  permanentInstructions: string | null;
  avoidInstructions: string | null;
};

type SampleRow = {
  anonymizedText: string | null;
  sourceLabel: string | null;
  styleNotes: string | null;
  createdAt: Date;
};

function buildPrivacyBlockReply() {
  return 'Tekstissä havaittiin tai siihen jäi automaattisen anonymisoinnin jälkeen tunnistetietoja, joita ei voida lähettää AI-käsittelyyn turvallisesti. Poista nimi-, yhteys-, tunniste- ja osoitetiedot ja yritä uudelleen.';
}

function buildPrivacyOutputBlockReply() {
  return 'AI-vastaus sisälsi henkilötietoihin viittaavia tietoja, joten sitä ei näytetä turvallisuussyistä. Muokkaa pyyntöä yleisemmäksi ilman tunnistetietoja ja yritä uudelleen.';
}

function trimForStorage(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).trim();
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  return Number.isFinite(userId) ? userId : null;
}

async function ensureProfile(userId: number): Promise<ProfileRow> {
  const existing = await prisma.$queryRaw<ProfileRow[]>`
    SELECT
      "id", "styleSummary", "writingStyle", "preferredStructure", "detailLevel",
      "permanentInstructions", "avoidInstructions"
    FROM "UserAiProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;

  if (existing[0]?.id) return existing[0];

  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "UserAiProfile" ("id", "userId", "createdAt", "updatedAt")
    VALUES (${id}, ${userId}, NOW(), NOW())
  `;

  return {
    id,
    styleSummary: null,
    writingStyle: null,
    preferredStructure: null,
    detailLevel: null,
    permanentInstructions: null,
    avoidInstructions: null,
  };
}

async function getRecentSamples(profileId: string, limit = DEFAULT_RECENT_SAMPLE_LIMIT) {
  return prisma.$queryRaw<SampleRow[]>`
    SELECT "anonymizedText", "sourceLabel", "styleNotes", "createdAt"
    FROM "UserAiProfileSample"
    WHERE "profileId" = ${profileId}
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `;
}

async function getStoredSampleCount(profileId: string) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*) AS count
    FROM "UserAiProfileSample"
    WHERE "profileId" = ${profileId}
  `;

  const raw = rows[0]?.count ?? 0;
  return typeof raw === 'bigint' ? Number(raw) : Number(raw);
}

async function trimStoredSamples(profileId: string, keepCount: number) {
  await prisma.$executeRaw`
    DELETE FROM "UserAiProfileSample"
    WHERE "id" IN (
      SELECT "id"
      FROM "UserAiProfileSample"
      WHERE "profileId" = ${profileId}
      ORDER BY "createdAt" DESC
      OFFSET ${keepCount}
    )
  `;
}

function trimForPrompt(value: string | null | undefined, maxLength: number) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n...[katkaistu]`;
}

function buildMergePromptPayload(profile: ProfileRow, recentSamples: SampleRow[], newSample: string, sourceLabel: string | null) {
  const payload = {
    currentStyleSummary: profile.styleSummary || '',
    manuallyDefinedWritingStyle: profile.writingStyle || '',
    preferredStructure: profile.preferredStructure || '',
    detailLevel: profile.detailLevel || '',
    permanentInstructions: profile.permanentInstructions || '',
    avoidInstructions: profile.avoidInstructions || '',
    newSample: {
      sourceLabel: sourceLabel || '',
      text: trimForPrompt(newSample, 9000),
    },
    recentSavedSamples: recentSamples.map((sample) => ({
      sourceLabel: sample.sourceLabel || '',
      text: trimForPrompt(sample.anonymizedText, 3000),
      styleNotes: trimForPrompt(sample.styleNotes, 800),
    })),
  };

  const sanitizedPayload = sanitizeJsonValue(payload, {
    defaultMode: 'persistentSample',
    modeForPath(path) {
      const key = path[path.length - 1];
      if (key === 'sourceLabel') return 'chat';
      return 'persistentSample';
    },
  });

  return JSON.stringify(sanitizedPayload.value);
}

async function createMergedStyleSummary(
  userId: number,
  profile: ProfileRow,
  recentSamples: SampleRow[],
  anonymizedText: string,
  sourceLabel: string | null,
  client: Awaited<ReturnType<typeof getOpenAiClientForUser>>["client"],
  model: string
) {
  const workspaceContext = await getUserAiWorkspaceContext(userId);
  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `Olet kliinisten tekstien kirjoitustyylin analysoija.
Tehtäväsi on päivittää käyttäjän AI-kirjoitusprofiilin tyyliyhteenveto uuden anonymisoidun esimerkin perusteella.

Työtilan konteksti:
- käyttöliittymän kieli on ${workspaceContext.uiLanguage};
- kliininen maa on ${workspaceContext.clinicalCountry};
- kliininen vastauskieli on ${workspaceContext.clinicalOutputLanguage};
- käyttäjän kliininen dokumentointitapa voi heijastaa valitun kliinisen maan käytäntöjä ja terminologiaa;
- kirjoita lopullinen tyyliyhteenveto käyttöliittymän kielellä (${workspaceContext.uiLanguage}), jotta käyttäjä voi lukea ja muokata sitä helposti.

Tärkeät säännöt:
- Älä kirjoita tyyliyhteenvetoa joka kerta alusta, jos nykyinen tyyliyhteenveto on annettu.
- Yhdistä uusi havainto olemassa olevaan tyyliyhteenvetoon.
- Säilytä aiemmin tunnistetut pysyvät piirteet, jos uusi esimerkki ei selvästi kumoa niitä.
- Huomioi, että käyttäjän suomen kieli ja kliininen kirjoitustyyli voivat ajan myötä kehittyä.
- Jos uusi esimerkki on laadukkaampi, tarkempi tai uudempi, anna sille hieman enemmän painoa.
- Älä tee potilasta koskevia kliinisiä johtopäätöksiä.
- Älä mainitse anonymisointia, tunnisteita tai placeholder-merkkejä.
- Älä toista potilastietoja, nimiä, päivämääriä tai yksittäisiä kliinisiä tapahtumia.
- Keskity vain kirjoitustyyliin, rakenteeseen, yksityiskohtaisuuteen, sanavalintoihin, kronologiaan, lääkitysmuutosten kuvaamiseen ja siihen, miten AI:n kannattaa jäljitellä käyttäjän dokumentointitapaa.
- Pituus 90-160 sanaa.
- Lopputulos on yksi käytännöllinen tyyliyhteenveto myöhempää AI-kirjoitusavustajaa varten.`,
      },
      {
        role: 'user',
        content: buildMergePromptPayload(profile, recentSamples, anonymizedText, sourceLabel),
      },
    ],
  });

  return response.choices[0].message.content?.trim() || profile.styleSummary || '';
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { client, model } = await getOpenAiClientForUser(userId);

    const body = await req.json();
    const exampleText = typeof body?.text === 'string' ? body.text : '';
    const saveAnonymizedSample = body?.saveAnonymizedSample === true;
    const sourceLabel = typeof body?.sourceLabel === 'string' ? body.sourceLabel.trim().slice(0, 120) : null;

    if (!exampleText.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const inputPrivacy = preparePrivacyPayload([
      { key: 'exampleText', value: exampleText, mode: 'persistentSample' },
      { key: 'sourceLabel', value: sourceLabel, mode: 'generalText' },
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

    const anonymized = anonymizePatientText(inputPrivacy.sanitized.exampleText, { mode: 'profileSample' });
    const profile = await ensureProfile(userId);
    const recentSamples = await getRecentSamples(profile.id);
    const styleSummary = await createMergedStyleSummary(
      userId,
      profile,
      recentSamples,
      anonymized.sanitizedText,
      inputPrivacy.sanitized.sourceLabel || null,
      client,
      model
    );
    const outputPrivacy = preparePrivacyPayload([
      { key: 'styleSummary', value: styleSummary, mode: 'persistentStorage' },
    ]);
    const safeStyleSummary = trimForStorage(outputPrivacy.sanitized.styleSummary ?? styleSummary, MAX_STORED_STYLE_SUMMARY_CHARS);
    const storedAnonymizedSample = trimForStorage(anonymized.sanitizedText, MAX_STORED_SAMPLE_CHARS);

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

    await prisma.$executeRaw`
      UPDATE "UserAiProfile"
      SET "styleSummary" = ${safeStyleSummary}, "updatedAt" = NOW()
      WHERE "id" = ${profile.id}
    `;

    if (saveAnonymizedSample) {
      const sampleId = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "UserAiProfileSample" (
          "id", "profileId", "anonymizedText", "sourceLabel", "styleNotes", "createdAt", "updatedAt"
        ) VALUES (
          ${sampleId}, ${profile.id}, ${storedAnonymizedSample}, ${inputPrivacy.sanitized.sourceLabel || null}, ${safeStyleSummary}, NOW(), NOW()
        )
      `;
      await trimStoredSamples(profile.id, MAX_SAVED_PROFILE_SAMPLES);
    }

    const storedSampleCount = await getStoredSampleCount(profile.id);

    return NextResponse.json({
      styleSummary: safeStyleSummary,
      anonymizedText: anonymized.sanitizedText,
      privacy: {
        ...inputPrivacy.privacy,
        findings: anonymized.findings,
      },
      savedSample: saveAnonymizedSample,
      mergeMode: 'incremental',
      previousStyleSummary: profile.styleSummary || '',
      recentSamplesUsed: recentSamples.length,
      route: {
        outputSanitized: outputPrivacy.privacy.anonymized,
      },
      storage: {
        sampleStored: saveAnonymizedSample,
        sampleCount: storedSampleCount,
        sampleLimit: MAX_SAVED_PROFILE_SAMPLES,
        sampleTextTruncated: anonymized.sanitizedText.length > MAX_STORED_SAMPLE_CHARS,
        styleSummaryTruncated: (outputPrivacy.sanitized.styleSummary ?? styleSummary).trim().length > MAX_STORED_STYLE_SUMMARY_CHARS,
      },
    });
  } catch (error: any) {
    console.error('AI profile style analysis error:', error.message || error);
    return NextResponse.json({
      error: 'AI profile style analysis failed',
      details: error.message,
    }, { status: 500 });
  }
}
