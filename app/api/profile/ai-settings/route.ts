import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../../lib/admin-auth';
import { prisma } from '../../../../lib/prisma';
import { AI_MODEL_REGISTRY, DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER, getProviderDefaultModel } from '../../../../lib/ai/modelRegistry';
import {
  getUserAiAccessPolicy,
  getUserAiSettings,
  normalizeAssistantResponseLanguage,
  normalizeAssistantResponseMode,
  normalizeCredentialMode,
  normalizeProvider,
} from '../../../../lib/ai/userAiSettings';

function normalizeOptionalModel(value: unknown, provider: keyof typeof AI_MODEL_REGISTRY) {
  if (typeof value !== 'string') return getProviderDefaultModel(provider);
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : getProviderDefaultModel(provider);
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
    const defaultModel = normalizeOptionalModel(body?.defaultModel ?? DEFAULT_AI_MODEL, defaultProvider);
    const credentialMode = normalizeCredentialMode(body?.credentialMode);
    const allowAgentModelSelection = body?.allowAgentModelSelection !== false;
    const assistantResponseMode = normalizeAssistantResponseMode(body?.assistantResponseMode);
    const assistantFixedLanguage = assistantResponseMode === 'fixed'
      ? normalizeAssistantResponseLanguage(body?.assistantFixedLanguage)
      : null;

    if (policy.allowedProviders.length > 0 && !policy.allowedProviders.includes(defaultProvider)) {
      return NextResponse.json({ error: 'Tämä AI-palvelu ei ole sallittu käyttäjälle' }, { status: 403 });
    }

    if (credentialMode === 'platform' && !policy.allowPlatformCredentials) {
      return NextResponse.json({ error: 'Yhteiset API-avaimet eivät ole käytössä tälle käyttäjälle' }, { status: 403 });
    }

    if ((credentialMode === 'user' || credentialMode === 'auto') && !policy.allowUserCredentials) {
      return NextResponse.json({ error: 'Omat API-avaimet eivät ole käytössä tälle käyttäjälle' }, { status: 403 });
    }

    if (assistantResponseMode === 'fixed' && !assistantFixedLanguage) {
      return NextResponse.json({ error: 'AI-vastauskieli puuttuu' }, { status: 400 });
    }

    await prisma.$executeRaw`
      INSERT INTO "UserAiSettings" (
        "id", "userId", "defaultProvider", "defaultModel", "allowAgentModelSelection", "credentialMode", "assistantResponseMode", "assistantFixedLanguage", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, ${userId}, ${defaultProvider}, ${defaultModel}, ${allowAgentModelSelection}, ${credentialMode}, ${assistantResponseMode}, ${assistantFixedLanguage}, NOW(), NOW()
      )
      ON CONFLICT ("userId")
      DO UPDATE SET
        "defaultProvider" = EXCLUDED."defaultProvider",
        "defaultModel" = EXCLUDED."defaultModel",
        "allowAgentModelSelection" = EXCLUDED."allowAgentModelSelection",
        "credentialMode" = EXCLUDED."credentialMode",
        "assistantResponseMode" = EXCLUDED."assistantResponseMode",
        "assistantFixedLanguage" = EXCLUDED."assistantFixedLanguage",
        "updatedAt" = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('User AI settings save failed:', error);
    return NextResponse.json({ error: 'AI-asetusten tallennus epäonnistui' }, { status: 500 });
  }
}
