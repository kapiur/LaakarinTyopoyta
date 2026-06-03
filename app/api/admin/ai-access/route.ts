import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import { prisma } from '../../../../lib/prisma';
import { AI_MODEL_REGISTRY } from '../../../../lib/ai/modelRegistry';

function normalizeAllowedProviders(value: unknown) {
  if (!Array.isArray(value)) return null;
  const knownProviders = new Set(Object.keys(AI_MODEL_REGISTRY));
  const providers = value
    .filter((item): item is string => typeof item === 'string' && knownProviders.has(item));
  return providers.length > 0 ? JSON.stringify(providers) : null;
}

function parseAllowedProviders(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
  return [];
}

type UserRow = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  allowPlatformCredentials: boolean | null;
  allowUserCredentials: boolean | null;
  requireUserCredentials: boolean | null;
  allowedProviders: string | null;
  monthlyTokenLimit: number | null;
  monthlyCostLimitCents: number | null;
};

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const rows = await prisma.$queryRaw<UserRow[]>`
      SELECT
        u."id", u."email", u."name", u."role"::text AS "role", u."isActive",
        p."allowPlatformCredentials", p."allowUserCredentials", p."requireUserCredentials",
        p."allowedProviders", p."monthlyTokenLimit", p."monthlyCostLimitCents"
      FROM "User" u
      LEFT JOIN "UserAiAccessPolicy" p ON p."userId" = u."id"
      ORDER BY u."role" ASC, u."createdAt" ASC
    `;

    return NextResponse.json({
      users: rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        isActive: row.isActive,
        policy: {
          allowPlatformCredentials: row.allowPlatformCredentials !== false,
          allowUserCredentials: row.allowUserCredentials === true,
          requireUserCredentials: row.requireUserCredentials === true,
          allowedProviders: parseAllowedProviders(row.allowedProviders),
          monthlyTokenLimit: row.monthlyTokenLimit,
          monthlyCostLimitCents: row.monthlyCostLimitCents,
        },
      })),
      registry: AI_MODEL_REGISTRY,
    });
  } catch (error) {
    console.error('AI access policy loading failed:', error);
    return NextResponse.json({ error: 'AI-käyttöoikeuksien lataus epäonnistui' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const userId = Number(body?.userId);

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Käyttäjä puuttuu' }, { status: 400 });
    }

    const allowPlatformCredentials = body?.allowPlatformCredentials !== false;
    const allowUserCredentials = body?.allowUserCredentials === true;
    const requireUserCredentials = body?.requireUserCredentials === true;
    const allowedProviders = normalizeAllowedProviders(body?.allowedProviders);
    const monthlyTokenLimit = Number.isFinite(Number(body?.monthlyTokenLimit)) ? Number(body?.monthlyTokenLimit) : null;
    const monthlyCostLimitCents = Number.isFinite(Number(body?.monthlyCostLimitCents)) ? Number(body?.monthlyCostLimitCents) : null;

    if (requireUserCredentials && !allowUserCredentials) {
      return NextResponse.json({ error: 'Omat API-avaimet tulee sallia, jos niitä vaaditaan' }, { status: 400 });
    }

    await prisma.$executeRaw`
      INSERT INTO "UserAiAccessPolicy" (
        "id", "userId", "allowPlatformCredentials", "allowUserCredentials", "requireUserCredentials",
        "allowedProviders", "monthlyTokenLimit", "monthlyCostLimitCents", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, ${userId}, ${allowPlatformCredentials}, ${allowUserCredentials}, ${requireUserCredentials},
        ${allowedProviders}, ${monthlyTokenLimit}, ${monthlyCostLimitCents}, NOW(), NOW()
      )
      ON CONFLICT ("userId")
      DO UPDATE SET
        "allowPlatformCredentials" = EXCLUDED."allowPlatformCredentials",
        "allowUserCredentials" = EXCLUDED."allowUserCredentials",
        "requireUserCredentials" = EXCLUDED."requireUserCredentials",
        "allowedProviders" = EXCLUDED."allowedProviders",
        "monthlyTokenLimit" = EXCLUDED."monthlyTokenLimit",
        "monthlyCostLimitCents" = EXCLUDED."monthlyCostLimitCents",
        "updatedAt" = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('AI access policy save failed:', error);
    return NextResponse.json({ error: 'AI-käyttöoikeuksien tallennus epäonnistui' }, { status: 500 });
  }
}
