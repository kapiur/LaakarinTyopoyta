import { prisma } from '../../prisma';
import { decryptSecret } from '../../security/secretCrypto';
import { getUserAiAccessPolicy, isProviderAllowedForUser, type AiCredentialMode } from '../userAiSettings';
import type { AiProviderKey, AiProviderSecret } from '../providers/types';

type AiProviderCredentialRow = {
  encryptedSecret: string;
  baseUrl: string | null;
  defaultModel: string | null;
};

type UserAiCredentialRow = {
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

async function getUserSecret(userId: number, provider: AiProviderKey): Promise<AiProviderSecret | null> {
  try {
    const rows = await prisma.$queryRaw<UserAiCredentialRow[]>`
      SELECT "encryptedSecret", "baseUrl", "defaultModel"
      FROM "UserAiCredential"
      WHERE "userId" = ${userId} AND "provider" = ${provider}
      LIMIT 1
    `;

    const credential = rows[0];

    if (!credential) return null;

    return {
      provider,
      value: decryptSecret(credential.encryptedSecret),
      baseUrl: credential.baseUrl,
      defaultModel: credential.defaultModel,
      source: "user",
    };
  } catch (error) {
    console.error("User AI credential loading failed:", error);
    return null;
  }
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

    const userSecret = await getUserSecret(input.userId, input.provider);
    if (userSecret) return userSecret;

    throw new Error('Personal AI credential is not configured for this provider');
  }

  if (credentialMode === 'auto' && policy.allowUserCredentials) {
    const userSecret = await getUserSecret(input.userId, input.provider);
    if (userSecret) return userSecret;
  }

  if (policy.requireUserCredentials) {
    throw new Error('This user must use personal AI credentials, but personal credentials are not configured yet');
  }

  if (!policy.allowPlatformCredentials) {
    throw new Error('Platform AI credentials are disabled for this user');
  }

  const platformSecret = await getPlatformSecret(input.provider);
  if (platformSecret) return platformSecret;

  throw new Error(`AI credential is not configured for provider: ${input.provider}`);
}
