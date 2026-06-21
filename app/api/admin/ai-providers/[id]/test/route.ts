import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../../../../lib/admin-auth';
import { decryptSecret } from '../../../../../../lib/security/secretCrypto';
import {
  getProviderDefaultModel,
  getProviderOpenAiCompatibleBaseUrl,
  isOpenAiCompatibleProvider,
  normalizeModelForProvider,
} from '../../../../../../lib/ai/modelRegistry';
import { runOpenAiCompletion } from '../../../../../../lib/ai/providers/openai';
import type { AiProviderKey } from '../../../../../../lib/ai/providers/types';

type AiProviderCredentialRow = {
  id: string;
  provider: string;
  encryptedSecret: string;
  baseUrl: string | null;
  projectId: string | null;
  defaultModel: string | null;
};

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const rows = await prisma.$queryRaw<AiProviderCredentialRow[]>`
      SELECT "id", "provider", "encryptedSecret", "baseUrl", "projectId", "defaultModel"
      FROM "AiProviderCredential"
      WHERE "id" = ${params.id}
      LIMIT 1
    `;

    const credential = rows[0];

    if (!credential) {
      return NextResponse.json({ error: 'AI-palvelua ei löytynyt' }, { status: 404 });
    }

    const provider = credential.provider as AiProviderKey;

    if (!isOpenAiCompatibleProvider(provider)) {
      return NextResponse.json({ error: 'Tämän AI-palvelun yhteystestiä ei ole vielä toteutettu' }, { status: 400 });
    }

    if (provider === 'yandex' && !credential.projectId) {
      return NextResponse.json({ error: 'YandexGPT vaatii folder / project ID:n' }, { status: 400 });
    }

    const model = normalizeModelForProvider(provider, credential.defaultModel || getProviderDefaultModel(provider));
    const baseUrl = credential.baseUrl || getProviderOpenAiCompatibleBaseUrl(provider);

    await runOpenAiCompletion({
      userId: 0,
      provider,
      model,
      messages: [
        { role: 'system', content: 'Return exactly: ok' },
        { role: 'user', content: 'Connection test' },
      ],
      temperature: 0,
      secret: {
        provider,
        value: decryptSecret(credential.encryptedSecret),
        baseUrl,
        projectId: credential.projectId,
        defaultModel: credential.defaultModel || model,
        source: 'platform',
      },
    });

    await prisma.$executeRaw`
      UPDATE "AiProviderCredential"
      SET "lastTestedAt" = NOW(), "lastTestOk" = true, "lastTestError" = NULL, "updatedAt" = NOW()
      WHERE "id" = ${params.id}
    `;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('AI provider credential test failed:', error?.message || error);

    await prisma.$executeRaw`
      UPDATE "AiProviderCredential"
      SET "lastTestedAt" = NOW(), "lastTestOk" = false, "lastTestError" = ${String(error?.message || error).slice(0, 500)}, "updatedAt" = NOW()
      WHERE "id" = ${params.id}
    `;

    return NextResponse.json({ error: 'AI-palvelun testaus epäonnistui' }, { status: 500 });
  }
}
