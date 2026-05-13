import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

const TEXT_FIELDS = [
  'role',
  'specialty',
  'workplace',
  'experienceLevel',
  'defaultClinicalContext',
  'preferredStructure',
  'detailLevel',
  'writingStyle',
  'permanentInstructions',
  'avoidInstructions',
  'styleSummary',
] as const;

type TextField = typeof TEXT_FIELDS[number];

type AiProfileRow = {
  id: string;
  userId: number;
  role: string | null;
  specialty: string | null;
  workplace: string | null;
  experienceLevel: string | null;
  defaultClinicalContext: string | null;
  preferredStructure: string | null;
  detailLevel: string | null;
  writingStyle: string | null;
  permanentInstructions: string | null;
  avoidInstructions: string | null;
  styleSummary: string | null;
  useProfileByDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function cleanText(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  return Number.isFinite(userId) ? userId : null;
}

async function findProfile(userId: number) {
  const rows = await prisma.$queryRaw<AiProfileRow[]>`
    SELECT * FROM "UserAiProfile" WHERE "userId" = ${userId} LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function GET() {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await findProfile(userId);

  return NextResponse.json({ profile });
}

export async function PUT(req: Request) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const data = TEXT_FIELDS.reduce<Record<TextField, string | null>>((acc, field) => {
    acc[field] = cleanText(body?.[field]);
    return acc;
  }, {} as Record<TextField, string | null>);

  const useProfileByDefault = typeof body?.useProfileByDefault === 'boolean'
    ? body.useProfileByDefault
    : true;

  const existing = await findProfile(userId);

  if (!existing) {
    const id = randomUUID();
    const rows = await prisma.$queryRaw<AiProfileRow[]>`
      INSERT INTO "UserAiProfile" (
        "id", "userId", "role", "specialty", "workplace", "experienceLevel",
        "defaultClinicalContext", "preferredStructure", "detailLevel", "writingStyle",
        "permanentInstructions", "avoidInstructions", "styleSummary", "useProfileByDefault",
        "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${userId}, ${data.role}, ${data.specialty}, ${data.workplace}, ${data.experienceLevel},
        ${data.defaultClinicalContext}, ${data.preferredStructure}, ${data.detailLevel}, ${data.writingStyle},
        ${data.permanentInstructions}, ${data.avoidInstructions}, ${data.styleSummary}, ${useProfileByDefault},
        NOW(), NOW()
      ) RETURNING *
    `;

    return NextResponse.json({ profile: rows[0] });
  }

  const rows = await prisma.$queryRaw<AiProfileRow[]>`
    UPDATE "UserAiProfile"
    SET
      "role" = ${data.role},
      "specialty" = ${data.specialty},
      "workplace" = ${data.workplace},
      "experienceLevel" = ${data.experienceLevel},
      "defaultClinicalContext" = ${data.defaultClinicalContext},
      "preferredStructure" = ${data.preferredStructure},
      "detailLevel" = ${data.detailLevel},
      "writingStyle" = ${data.writingStyle},
      "permanentInstructions" = ${data.permanentInstructions},
      "avoidInstructions" = ${data.avoidInstructions},
      "styleSummary" = ${data.styleSummary},
      "useProfileByDefault" = ${useProfileByDefault},
      "updatedAt" = NOW()
    WHERE "userId" = ${userId}
    RETURNING *
  `;

  return NextResponse.json({ profile: rows[0] });
}
