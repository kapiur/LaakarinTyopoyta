import { prisma } from '../../prisma';
import { decryptSecret } from '../../security/secretCrypto';
import type { AiProviderKey, AiProviderSecret } from '../providers/types';

type AiProviderCredentialRow = {
  encryptedSecret: string;
  baseUrl: string | null;
  defaultModel: string | null;
};

function getEnvSecret(provider: AiProviderKey): AiProviderSecret | null {
  if (provider === 'openai') {
    const value = process.env.OPENAI_API_KEY;
    if (!value) return null;

    return {
      provider,
      value,
      source: 'env',
    };
  }

  return null;
}

export async function resolveAiCredential(provider: AiProviderKey): Promise<AiProviderSecret> {
  try {
    const rows = await prisma.$queryRaw<AiProviderCredentialRow[]>`
      SELECT "encryptedSecret", "baseUrl", "defaultModel"
      FROM "AiProviderCredential"
      WHERE "provider" = ${provider} AND "isEnabled" = true
      LIMIT 1
    `;

    const credential = rows[0];

    if (credential) {
      return {
        provider,
        value: decryptSecret(credential.encryptedSecret),
        baseUrl: credential.baseUrl,
        defaultModel: credential.defaultModel,
        source: 'platform',
      };
    }
  } catch (error) {
    console.error('Platform AI credential loading failed, falling back to env credential if available:', error);
  }

  const envSecret = getEnvSecret(provider);

  if (envSecret) return envSecret;

  throw new Error(`AI credential is not configured for provider: ${provider}`);
}
