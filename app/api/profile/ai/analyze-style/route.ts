import { randomUUID } from 'crypto';
import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { anonymizePatientText } from '../../../../../lib/privacy/anonymizePatientText';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CURRENT_MODEL = 'gpt-5.4';

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  return Number.isFinite(userId) ? userId : null;
}

async function ensureProfile(userId: number) {
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "UserAiProfile" WHERE "userId" = ${userId} LIMIT 1
  `;

  if (existing[0]?.id) return existing[0].id;

  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "UserAiProfile" ("id", "userId", "createdAt", "updatedAt")
    VALUES (${id}, ${userId}, NOW(), NOW())
  `;

  return id;
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const exampleText = typeof body?.text === 'string' ? body.text : '';
    const saveAnonymizedSample = body?.saveAnonymizedSample === true;
    const sourceLabel = typeof body?.sourceLabel === 'string' ? body.sourceLabel.trim().slice(0, 120) : null;

    if (!exampleText.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const anonymized = anonymizePatientText(exampleText, { mode: 'profileSample' });

    const response = await openai.chat.completions.create({
      model: CURRENT_MODEL,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `Olet Suomen terveydenhuollon kliinisten tekstien kirjoitustyylin analysoija.
Tehtäväsi on analysoida lääkärin anonymisoituja esimerkkitekstejä ja muodostaa lyhyt, käytännöllinen tyyliyhteenveto myöhempää AI-kirjoitusavustajaa varten.
Älä mainitse anonymisointia, tunnisteita tai placeholder-merkkejä.
Älä tee kliinisiä johtopäätöksiä potilaasta.
Keskity vain kirjoitustyyliin, rakenteeseen, yksityiskohtaisuuteen, sanavalintoihin, kronologiaan ja siihen, miten käyttäjän tyyliä kannattaa jäljitellä.
Kirjoita vastaus suomeksi. Pituus enintään 120 sanaa.`,
        },
        {
          role: 'user',
          content: anonymized.sanitizedText,
        },
      ],
    });

    const styleSummary = response.choices[0].message.content?.trim() || '';
    const profileId = await ensureProfile(userId);

    await prisma.$executeRaw`
      UPDATE "UserAiProfile"
      SET "styleSummary" = ${styleSummary}, "updatedAt" = NOW()
      WHERE "id" = ${profileId}
    `;

    if (saveAnonymizedSample) {
      const sampleId = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "UserAiProfileSample" (
          "id", "profileId", "anonymizedText", "sourceLabel", "styleNotes", "createdAt", "updatedAt"
        ) VALUES (
          ${sampleId}, ${profileId}, ${anonymized.sanitizedText}, ${sourceLabel}, ${styleSummary}, NOW(), NOW()
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
    });
  } catch (error: any) {
    console.error('AI profile style analysis error:', error.message || error);
    return NextResponse.json({
      error: 'AI profile style analysis failed',
      details: error.message,
    }, { status: 500 });
  }
}
