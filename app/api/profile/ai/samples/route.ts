import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);
  return Number.isFinite(userId) ? userId : null;
}

async function getProfileId(userId: number) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "UserAiProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;

  return rows[0]?.id ?? null;
}

export async function GET() {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profileId = await getProfileId(userId);
  if (!profileId) {
    return NextResponse.json({ sampleCount: 0, latestSampleAt: null });
  }

  const countRows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*) AS count
    FROM "UserAiProfileSample"
    WHERE "profileId" = ${profileId}
  `;
  const latestRows = await prisma.$queryRaw<Array<{ createdAt: Date | null }>>`
    SELECT "createdAt"
    FROM "UserAiProfileSample"
    WHERE "profileId" = ${profileId}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  const rawCount = countRows[0]?.count ?? 0;
  const sampleCount = typeof rawCount === 'bigint' ? Number(rawCount) : Number(rawCount);

  return NextResponse.json({
    sampleCount,
    latestSampleAt: latestRows[0]?.createdAt ?? null,
  });
}

export async function DELETE() {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profileId = await getProfileId(userId);
  if (!profileId) {
    return NextResponse.json({ deleted: 0, sampleCount: 0 });
  }

  const deletedRows = await prisma.$queryRaw<Array<{ id: string }>>`
    DELETE FROM "UserAiProfileSample"
    WHERE "profileId" = ${profileId}
    RETURNING "id"
  `;

  return NextResponse.json({
    deleted: deletedRows.length,
    sampleCount: 0,
  });
}
