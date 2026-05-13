import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { normalizeAiProfileMode } from '../../../../lib/ai/userAiProfile';

const ALLOWED_ICONS = new Set(['FileText', 'ListChecks', 'Languages', 'Scissors', 'FlaskConical']);

type RouteContext = {
  params: {
    id: string;
  };
};

type AiToolRow = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  icon: string | null;
  prompt: string;
  isActive: boolean;
  order: number;
  useUserAiProfile: boolean;
  profileMode: string;
  createdAt: Date;
  updatedAt: Date;
};

function getUserId(session: unknown) {
  const userId = Number((session as any)?.user?.id);
  return Number.isFinite(userId) ? userId : null;
}

async function findUserTool(id: string, userId: number) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "AiTool"
    WHERE "id" = ${id} AND "userId" = ${userId} AND "scope" = 'USER'
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existingTool = await findUserTool(params.id, userId);
    if (!existingTool) return NextResponse.json({ error: 'AI tool not found' }, { status: 404 });

    const body = await req.json();
    const currentRows = await prisma.$queryRaw<AiToolRow[]>`
      SELECT
        "id", "key", "label", "description", "icon", "prompt", "isActive", "order",
        COALESCE("useUserAiProfile", true) AS "useUserAiProfile",
        COALESCE("profileMode", 'full') AS "profileMode",
        "createdAt", "updatedAt"
      FROM "AiTool"
      WHERE "id" = ${existingTool.id}
      LIMIT 1
    `;
    const current = currentRows[0];

    const label = typeof body.label === 'string' ? body.label.trim() : current.label;
    if (!label) return NextResponse.json({ error: 'label cannot be empty' }, { status: 400 });

    const description = typeof body.description === 'string' ? body.description.trim() : current.description;
    const icon = typeof body.icon === 'string' ? (ALLOWED_ICONS.has(body.icon) ? body.icon : 'FileText') : current.icon;

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : current.prompt;
    if (!prompt) return NextResponse.json({ error: 'prompt cannot be empty' }, { status: 400 });

    const isActive = typeof body.isActive === 'boolean' ? body.isActive : current.isActive;
    const order = body.order !== undefined && Number.isFinite(Number(body.order)) ? Number(body.order) : current.order;
    const useUserAiProfile = typeof body.useUserAiProfile === 'boolean' ? body.useUserAiProfile : current.useUserAiProfile;
    const profileMode = body.profileMode !== undefined ? normalizeAiProfileMode(body.profileMode) : normalizeAiProfileMode(current.profileMode);

    const rows = await prisma.$queryRaw<AiToolRow[]>`
      UPDATE "AiTool"
      SET
        "label" = ${label},
        "description" = ${description},
        "icon" = ${icon},
        "prompt" = ${prompt},
        "isActive" = ${isActive},
        "order" = ${order},
        "useUserAiProfile" = ${useUserAiProfile},
        "profileMode" = ${profileMode},
        "updatedAt" = NOW()
      WHERE "id" = ${existingTool.id}
      RETURNING
        "id", "key", "label", "description", "icon", "prompt", "isActive", "order",
        "useUserAiProfile", "profileMode", "createdAt", "updatedAt"
    `;

    return NextResponse.json({ tool: rows[0] });
  } catch (error) {
    console.error('Update AI tool error:', error);
    return NextResponse.json({ error: 'AI tool update failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existingTool = await findUserTool(params.id, userId);
    if (!existingTool) return NextResponse.json({ error: 'AI tool not found' }, { status: 404 });

    await prisma.$executeRaw`
      DELETE FROM "AiTool" WHERE "id" = ${existingTool.id}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete AI tool error:', error);
    return NextResponse.json({ error: 'AI tool delete failed' }, { status: 500 });
  }
}
