import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { DEFAULT_AI_TOOL_METADATA } from '../../../lib/ai/toolMetadata';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { normalizeAiProfileMode } from '../../../lib/ai/userAiProfile';

const ALLOWED_ICONS = new Set(['FileText', 'ListChecks', 'Languages', 'Scissors', 'FlaskConical']);

type AiToolRow = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  icon: string | null;
  prompt: string;
  isActive: boolean;
  order: number;
  useUserAiProfile?: boolean;
  profileMode?: string;
  createdAt: Date;
  updatedAt: Date;
};

type DefaultToolVisibilityRow = {
  toolKey: string;
  isVisible: boolean;
};

function slugifyKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function makeUserToolKey(userId: number, rawKey: string) {
  const key = slugifyKey(rawKey) || 'oma-tyokalu';
  return `user-${userId}-${key}`;
}

function getUserId(session: unknown) {
  const userId = Number((session as any)?.user?.id);
  return Number.isFinite(userId) ? userId : null;
}

async function getManageTools(userId: number) {
  return prisma.$queryRaw<AiToolRow[]>`
    SELECT
      "id", "key", "label", "description", "icon", "prompt", "isActive", "order",
      COALESCE("useUserAiProfile", true) AS "useUserAiProfile",
      COALESCE("profileMode", 'full') AS "profileMode",
      "createdAt", "updatedAt"
    FROM "AiTool"
    WHERE "scope" = 'USER' AND "userId" = ${userId}
    ORDER BY "isActive" DESC, "order" ASC, "createdAt" ASC
  `;
}

async function getDefaultToolVisibility(userId: number) {
  try {
    return await prisma.$queryRaw<DefaultToolVisibilityRow[]>`
      SELECT "toolKey", "isVisible"
      FROM "UserAiToolVisibility"
      WHERE "userId" = ${userId}
    `;
  } catch (error) {
    console.error('Default AI tool visibility loading failed:', error);
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view');

    if (view === 'manage') {
      if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const tools = await getManageTools(userId);
      return NextResponse.json({ tools });
    }

    const visibilityRows = userId ? await getDefaultToolVisibility(userId) : [];
    const visibilityMap = new Map(visibilityRows.map((row) => [row.toolKey, row.isVisible]));
    const visibleDefaultTools = DEFAULT_AI_TOOL_METADATA.filter((tool) => visibilityMap.get(tool.key) !== false);

    const userTools = userId
      ? await prisma.$queryRaw<Array<{ key: string; label: string; description: string | null; icon: string | null }>>`
          SELECT "key", "label", "description", "icon"
          FROM "AiTool"
          WHERE "scope" = 'USER' AND "userId" = ${userId} AND "isActive" = true
          ORDER BY "order" ASC, "createdAt" ASC
        `
      : [];

    return NextResponse.json({
      tools: [
        ...visibleDefaultTools,
        ...userTools.map((tool) => ({
          key: tool.key,
          label: tool.label,
          description: tool.description ?? '',
          icon: tool.icon ?? 'FileText',
        })),
      ],
    });
  } catch (error) {
    console.error('AI tools API error:', error);
    return NextResponse.json({ tools: DEFAULT_AI_TOOL_METADATA });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const icon = typeof body.icon === 'string' && ALLOWED_ICONS.has(body.icon) ? body.icon : 'FileText';
    const order = Number.isFinite(Number(body.order)) ? Number(body.order) : 100;
    const rawKey = typeof body.key === 'string' && body.key.trim() ? body.key : label;
    const useUserAiProfile = typeof body.useUserAiProfile === 'boolean' ? body.useUserAiProfile : true;
    const profileMode = normalizeAiProfileMode(body.profileMode);

    if (!label) return NextResponse.json({ error: 'label is required' }, { status: 400 });
    if (!prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 });

    const baseKey = makeUserToolKey(userId, rawKey);
    let key = baseKey;
    let suffix = 2;

    while ((await prisma.aiTool.findFirst({ where: { userId, key }, select: { id: true } }))) {
      key = `${baseKey}-${suffix}`;
      suffix += 1;
    }

    const id = randomUUID();
    const rows = await prisma.$queryRaw<AiToolRow[]>`
      INSERT INTO "AiTool" (
        "id", "key", "label", "description", "icon", "prompt", "scope", "userId", "isActive", "order",
        "useUserAiProfile", "profileMode", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${key}, ${label}, ${description}, ${icon}, ${prompt}, 'USER', ${userId}, true, ${order},
        ${useUserAiProfile}, ${profileMode}, NOW(), NOW()
      ) RETURNING
        "id", "key", "label", "description", "icon", "prompt", "isActive", "order",
        "useUserAiProfile", "profileMode", "createdAt", "updatedAt"
    `;

    return NextResponse.json({ tool: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create AI tool error:', error);
    return NextResponse.json({ error: 'AI tool creation failed' }, { status: 500 });
  }
}
