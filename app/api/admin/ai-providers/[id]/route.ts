import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/admin-auth';
import { encryptSecret, getSecretPreview } from '../../../../../lib/security/secretCrypto';

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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const label = normalizeOptionalString(body?.label);
    const baseUrl = normalizeOptionalString(body?.baseUrl);
    const projectId = normalizeOptionalString(body?.projectId);
    const defaultModel = normalizeOptionalString(body?.defaultModel);
    const allowedModels = normalizeAllowedModels(body?.allowedModels);
    const isEnabled = body?.isEnabled !== false;
    const isDefault = body?.isDefault === true;
    const secret = normalizeOptionalString(body?.secret);

    if (secret) {
      await prisma.$executeRaw`
        UPDATE "AiProviderCredential"
        SET
          "label" = ${label},
          "encryptedSecret" = ${encryptSecret(secret)},
          "keyPreview" = ${getSecretPreview(secret)},
          "baseUrl" = ${baseUrl},
          "projectId" = ${projectId},
          "isEnabled" = ${isEnabled},
          "isDefault" = ${isDefault},
          "defaultModel" = ${defaultModel},
          "allowedModels" = ${allowedModels},
          "updatedAt" = NOW()
        WHERE "id" = ${params.id}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "AiProviderCredential"
        SET
          "label" = ${label},
          "baseUrl" = ${baseUrl},
          "projectId" = ${projectId},
          "isEnabled" = ${isEnabled},
          "isDefault" = ${isDefault},
          "defaultModel" = ${defaultModel},
          "allowedModels" = ${allowedModels},
          "updatedAt" = NOW()
        WHERE "id" = ${params.id}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('AI provider credential update failed:', error);
    return NextResponse.json({ error: 'AI-palvelun päivitys epäonnistui' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await prisma.$executeRaw`
      DELETE FROM "AiProviderCredential"
      WHERE "id" = ${params.id}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('AI provider credential delete failed:', error);
    return NextResponse.json({ error: 'AI-palvelun poisto epäonnistui' }, { status: 500 });
  }
}
