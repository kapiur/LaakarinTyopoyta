import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin } from '../../../../lib/admin-auth';
import { encryptSecret, getSecretPreview } from '../../../../lib/security/secretCrypto';
import { AI_MODEL_REGISTRY, DEFAULT_AI_MODEL } from '../../../../lib/ai/modelRegistry';
import type { AiProviderKey } from '../../../../lib/ai/providers/types';

const SUPPORTED_PROVIDERS = new Set(Object.keys(AI_MODEL_REGISTRY));

type AiProviderCredentialRow = {
  id: string;
  provider: string;
  label: string | null;
  keyPreview: string | null;
  baseUrl: string | null;
  isEnabled: boolean;
  isDefault: boolean;
  defaultModel: string | null;
  allowedModels: string | null;
  lastTestedAt: Date | null;
  lastTestOk: boolean | null;
  lastTestError: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeProvider(value: unknown): AiProviderKey | null {
  if (typeof value !== 'string') return null;
  if (!SUPPORTED_PROVIDERS.has(value)) return null;
  return value as AiProviderKey;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeAllowedModels(value: unknown) {
  if (!Array.isArray(value)) return null;
  const models = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
  return models.length > 0 ? JSON.stringify(models) : null;
}

function serializeCredential(row: AiProviderCredentialRow) {
  return {
    ...row,
    allowedModels: row.allowedModels ? JSON.parse(row.allowedModels) : [],
  };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const rows = await prisma.$queryRaw<AiProviderCredentialRow[]>`
      SELECT
        "id", "provider", "label", "keyPreview", "baseUrl", "isEnabled", "isDefault",
        "defaultModel", "allowedModels", "lastTestedAt", "lastTestOk", "lastTestError",
        "lastUsedAt", "createdAt", "updatedAt"
      FROM "AiProviderCredential"
      ORDER BY "provider" ASC
    `;

    return NextResponse.json({ providers: rows.map(serializeCredential), registry: AI_MODEL_REGISTRY });
  } catch (error) {
    console.error('AI provider credentials loading failed:', error);
    return NextResponse.json({ error: 'AI-palveluiden lataus epäonnistui' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const provider = normalizeProvider(body?.provider);
    const secret = normalizeOptionalString(body?.secret);

    if (!provider) return NextResponse.json({ error: 'Tuntematon AI-palvelu' }, { status: 400 });
    if (!secret) return NextResponse.json({ error: 'API-avain puuttuu' }, { status: 400 });

    const label = normalizeOptionalString(body?.label);
    const baseUrl = normalizeOptionalString(body?.baseUrl);
    const defaultModel = normalizeOptionalString(body?.defaultModel) ?? (provider === 'openai' ? DEFAULT_AI_MODEL : null);
    const allowedModels = normalizeAllowedModels(body?.allowedModels);
    const encryptedSecret = encryptSecret(secret);
    const keyPreview = getSecretPreview(secret);
    const isEnabled = body?.isEnabled !== false;
    const isDefault = body?.isDefault === true;

    await prisma.$executeRaw`
      INSERT INTO "AiProviderCredential" (
        "id", "provider", "label", "encryptedSecret", "keyPreview", "baseUrl",
        "isEnabled", "isDefault", "defaultModel", "allowedModels", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, ${provider}, ${label}, ${encryptedSecret}, ${keyPreview}, ${baseUrl},
        ${isEnabled}, ${isDefault}, ${defaultModel}, ${allowedModels}, NOW(), NOW()
      )
      ON CONFLICT ("provider")
      DO UPDATE SET
        "label" = EXCLUDED."label",
        "encryptedSecret" = EXCLUDED."encryptedSecret",
        "keyPreview" = EXCLUDED."keyPreview",
        "baseUrl" = EXCLUDED."baseUrl",
        "isEnabled" = EXCLUDED."isEnabled",
        "isDefault" = EXCLUDED."isDefault",
        "defaultModel" = EXCLUDED."defaultModel",
        "allowedModels" = EXCLUDED."allowedModels",
        "updatedAt" = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('AI provider credential save failed:', error);
    return NextResponse.json({ error: 'AI-palvelun tallennus epäonnistui' }, { status: 500 });
  }
}
