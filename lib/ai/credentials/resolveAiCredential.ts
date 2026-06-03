import { prisma } from '../../prisma';
import { decryptSecret } from '../../security/secretCrypto';
import { getUserAiAccessPolicy, isProviderAllowedForUser, type AiCredentialMode } from '../userAiSettings';
import type { AiProviderKey, AiProviderSecret } from '../providers/types';

type AiProviderCredentialRow = {
  encryptedSecret: string;
  baseUrl: string | null;
  defaultModel: string | null;
};

type ResolveAiCredentialInput = {
  userId: number;
  provider: AiProviderKey;
  credentialMode?: AiCredentialMode;
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

async function getPlatformSecret(provider: AiProviderKey): Promise<AiProviderSecret | null> {
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

  return getEnvSecret(provider);
}

export async function resolveAiCredential(input: ResolveAiCredentialInput): Promise<AiProviderSecret> {
  const credentialMode = input.credentialMode ?? 'platform';
  const policy = await getUserAiAccessPolicy(input.userId);

  if (!isProviderAllowedForUser(input.provider, policy)) {
    throw new Error(`AI provider is not allowed for this user: ${input.provider}`);
  }

  if (credentialMode === 'user') {
    if (!policy.allowUserCredentials) {
      throw new Error('Personal AI credentials are not allowed for this user');
    }

    throw new Error('Personal AI credentials are not implemented yet');
  }

  if (credentialMode === 'auto' && policy.allowUserCredentials) {
    // Future user-owned credential lookup will be inserted here.
  }

  if (policy.requireUserCredentials && !policy.allowPlatformCredentials) {
    throw new Error('This user must use personal AI credentials, but personal credentials are not configured yet');
  }

  if (!policy.allowPlatformCredentials) {
    throw new Error('Platform AI credentials are disabled for this user');
  }

  const platformSecret = await getPlatformSecret(input.provider);
  if (platformSecret) return platformSecret;

  throw new Error(`AI credential is not configured for provider: ${input.provider}`);
}
