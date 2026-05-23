import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { DEFAULT_AI_TOOL_METADATA } from '../../../../lib/ai/toolMetadata';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

type VisibilityRow = {
  toolKey: string;
  isVisible: boolean;
};

const DEFAULT_TOOL_KEYS = new Set(DEFAULT_AI_TOOL_METADATA.map((tool) => tool.key));

function getUserId(session: unknown) {
  const userId = Number((session as any)?.user?.id);
  return Number.isFinite(userId) ? userId : null;
}

function isDefaultToolKey(value: unknown): value is string {
  return typeof value === 'string' && DEFAULT_TOOL_KEYS.has(value);
}

async function getVisibilityRows(userId: number) {
  try {
    return await prisma.$queryRaw<VisibilityRow[]>`
      SELECT "toolKey", "isVisible"
      FROM "UserAiToolVisibility"
      WHERE "userId" = ${userId}
    `;
  } catch (error) {
    console.error('Default AI tool visibility loading failed:', error);
    return [];
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const visibilityRows = await getVisibilityRows(userId);
    const visibilityMap = new Map(visibilityRows.map((row) => [row.toolKey, row.isVisible]));

    return NextResponse.json({
      tools: DEFAULT_AI_TOOL_METADATA.map((tool) => ({
        ...tool,
        isVisible: visibilityMap.get(tool.key) !== false,
      })),
    });
  } catch (error) {
    console.error('Default AI tool visibility API error:', error);
    return NextResponse.json({ error: 'Visibility loading failed' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const toolKey = body?.toolKey;
    const isVisible = body?.isVisible;

    if (!isDefaultToolKey(toolKey)) {
      return NextResponse.json({ error: 'Invalid default AI tool key' }, { status: 400 });
    }

    if (typeof isVisible !== 'boolean') {
      return NextResponse.json({ error: 'isVisible must be boolean' }, { status: 400 });
    }

    const id = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "UserAiToolVisibility" (
        "id", "userId", "toolKey", "isVisible", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${userId}, ${toolKey}, ${isVisible}, NOW(), NOW()
      )
      ON CONFLICT ("userId", "toolKey")
      DO UPDATE SET
        "isVisible" = EXCLUDED."isVisible",
        "updatedAt" = NOW()
    `;

    return NextResponse.json({ toolKey, isVisible });
  } catch (error) {
    console.error('Default AI tool visibility update failed:', error);
    return NextResponse.json({ error: 'Visibility update failed' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.$executeRaw`
      DELETE FROM "UserAiToolVisibility"
      WHERE "userId" = ${userId}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Default AI tool visibility reset failed:', error);
    return NextResponse.json({ error: 'Visibility reset failed' }, { status: 500 });
  }
}
