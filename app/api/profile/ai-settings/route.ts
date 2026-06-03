import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../../lib/admin-auth';
import { prisma } from '../../../../lib/prisma';
import { AI_MODEL_REGISTRY, DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER } from '../../../../lib/ai/modelRegistry';
import { getUserAiAccessPolicy, getUserAiSettings, normalizeCredentialMode, normalizeProvider } from '../../../../lib/ai/userAiSettings';

function normalizeOptionalModel(value: unknown) {
  if (typeof value !== 'string') return DEFAULT_AI_MODEL;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_AI_MODEL;
}

export async function GET() {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);

  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await getUserAiSettings(userId);
  const policy = await getUserAiAccessPolicy(userId);

  return NextResponse.json({
    settings,
    policy,
    registry: AI_MODEL_REGISTRY,
  });
}

export async function PUT(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);

  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const policy = await getUserAiAccessPolicy(userId);
    const defaultProvider = normalizeProvider(body?.defaultProvider ?? DEFAULT_AI_PROVIDER);
    const defaultModel = normalizeOptionalModel(body?.defaultModel ?? DEFAULT_AI_MODEL);
    const credentialMode = normalizeCredentialMode(body?.credentialMode);
    const allowAgentModelSelection = body?.allowAgentModelSelection !== false;

    if (policy.allowedProviders.length > 0 && !policy.allowedProviders.includes(defaultProvider)) {
      return NextResponse.json({ error: 'Tämä AI-palvelu ei ole sallittu käyttäjälle' }, { status: 403 });
    }

    if (credentialMode === 'platform' && !policy.allowPlatformCredentials) {
      return NextResponse.json({ error: 'Yhteiset API-avaimet eivät ole käytössä tälle käyttäjälle' }, { status: 403 });
    }

    if ((credentialMode === 'user' || credentialMode === 'auto') && !policy.allowUserCredentials) {
      return NextResponse.json({ error: 'Omat API-avaimet eivät ole käytössä tälle käyttäjälle' }, { status: 403 });
    }

    await prisma.$executeRaw`
      INSERT INTO "UserAiSettings" (
        "id", "userId", "defaultProvider", "defaultModel", "allowAgentModelSelection", "credentialMode", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, ${userId}, ${defaultProvider}, ${defaultModel}, ${allowAgentModelSelection}, ${credentialMode}, NOW(), NOW()
      )
      ON CONFLICT ("userId")
      DO UPDATE SET
        "defaultProvider" = EXCLUDED."defaultProvider",
        "defaultModel" = EXCLUDED."defaultModel",
        "allowAgentModelSelection" = EXCLUDED."allowAgentModelSelection",
        "credentialMode" = EXCLUDED."credentialMode",
        "updatedAt" = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('User AI settings save failed:', error);
    return NextResponse.json({ error: 'AI-asetusten tallennus epäonnistui' }, { status: 500 });
  }
}
