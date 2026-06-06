import { randomUUID } from 'crypto';
import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { anonymizePatientText } from '../../../../../lib/privacy/anonymizePatientText';
import { sanitizeJsonValue } from '../../../../../lib/privacy/structured/sanitizeJsonValue';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CURRENT_MODEL = 'gpt-5.4';
const DEFAULT_RECENT_SAMPLE_LIMIT = 5;

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

async function createMergedStyleSummary(profile: ProfileRow, recentSamples: SampleRow[], anonymizedText: string, sourceLabel: string | null) {
  const response = await openai.chat.completions.create({
    model: CURRENT_MODEL,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `Olet Suomen terveydenhuollon kliinisten tekstien kirjoitustyylin analysoija.
Tehtäväsi on päivittää käyttäjän AI-kirjoitusprofiilin tyyliyhteenveto uuden anonymisoidun esimerkin perusteella.

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
- Kirjoita suomeksi.
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

    const body = await req.json();
    const exampleText = typeof body?.text === 'string' ? body.text : '';
    const saveAnonymizedSample = body?.saveAnonymizedSample !== false;
    const sourceLabel = typeof body?.sourceLabel === 'string' ? body.sourceLabel.trim().slice(0, 120) : null;

    if (!exampleText.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const anonymized = anonymizePatientText(exampleText, { mode: 'profileSample' });
    const profile = await ensureProfile(userId);
    const recentSamples = await getRecentSamples(profile.id);
    const styleSummary = await createMergedStyleSummary(profile, recentSamples, anonymized.sanitizedText, sourceLabel);

    await prisma.$executeRaw`
      UPDATE "UserAiProfile"
      SET "styleSummary" = ${styleSummary}, "updatedAt" = NOW()
      WHERE "id" = ${profile.id}
    `;

    if (saveAnonymizedSample) {
      const sampleId = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "UserAiProfileSample" (
          "id", "profileId", "anonymizedText", "sourceLabel", "styleNotes", "createdAt", "updatedAt"
        ) VALUES (
          ${sampleId}, ${profile.id}, ${anonymized.sanitizedText}, ${sourceLabel}, ${styleSummary}, NOW(), NOW()
        )
      `;
    }

    return NextResponse.json({
      styleSummary,
      anonymizedText: anonymized.sanitizedText,
      privacy: {
        anonymized: anonymized.hasFindings,
        findingTypes: anonymized.findingTypes,
        findings: anonymized.findings,
      },
      savedSample: saveAnonymizedSample,
      mergeMode: 'incremental',
      previousStyleSummary: profile.styleSummary || '',
      recentSamplesUsed: recentSamples.length,
    });
  } catch (error: any) {
    console.error('AI profile style analysis error:', error.message || error);
    return NextResponse.json({
      error: 'AI profile style analysis failed',
      details: error.message,
    }, { status: 500 });
  }
}
