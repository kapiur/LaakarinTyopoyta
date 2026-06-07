import { prisma } from '../../prisma';
import { decryptSecret } from '../../security/secretCrypto';
import { getProviderDefaultModel, getProviderOpenAiCompatibleBaseUrl } from '../modelRegistry';
import { getUserAiAccessPolicy, isProviderAllowedForUser, type AiCredentialMode } from '../userAiSettings';
import type { AiProviderKey, AiProviderSecret } from '../providers/types';

type AiProviderCredentialRow = {
  encryptedSecret: string;
  baseUrl: string | null;
  projectId: string | null;
  defaultModel: string | null;
};

type UserAiCredentialRow = {
  encryptedSecret: string;
  baseUrl: string | null;
  projectId: string | null;
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

  if (provider === 'google') {
    const value = process.env.GEMINI_API_KEY;
    if (!value) return null;

    return {
      provider,
      value,
      baseUrl: getProviderOpenAiCompatibleBaseUrl(provider),
      defaultModel: getProviderDefaultModel(provider),
      source: 'env',
    };
  }

  if (provider === 'yandex') {
    const value = process.env.YANDEX_API_KEY;
    if (!value) return null;

    return {
      provider,
      value,
      baseUrl: getProviderOpenAiCompatibleBaseUrl(provider),
      projectId: process.env.YANDEX_CLOUD_FOLDER_ID || null,
      defaultModel: getProviderDefaultModel(provider),
      source: 'env',
    };
  }

  return null;
}

function applyProviderDefaults(secret: AiProviderSecret): AiProviderSecret {
  return {
    ...secret,
    baseUrl: secret.baseUrl || getProviderOpenAiCompatibleBaseUrl(secret.provider),
    projectId: secret.projectId || null,
    defaultModel: secret.defaultModel || getProviderDefaultModel(secret.provider),
  };
}

async function getPlatformSecret(provider: AiProviderKey): Promise<AiProviderSecret | null> {
  try {
    const rows = await prisma.$queryRaw<AiProviderCredentialRow[]>`
      SELECT "encryptedSecret", "baseUrl", "projectId", "defaultModel"
      FROM "AiProviderCredential"
      WHERE "provider" = ${provider} AND "isEnabled" = true
      LIMIT 1
    `;

    const credential = rows[0];

    if (credential) {
      return applyProviderDefaults({
        provider,
        value: decryptSecret(credential.encryptedSecret),
        baseUrl: credential.baseUrl,
        projectId: credential.projectId,
        defaultModel: credential.defaultModel,
        source: 'platform',
      });
    }
  } catch (error) {
    console.error('Platform AI credential loading failed, falling back to env credential if available:', error);
  }

  const envSecret = getEnvSecret(provider);
  return envSecret ? applyProviderDefaults(envSecret) : null;
}

async function getUserSecret(userId: number, provider: AiProviderKey): Promise<AiProviderSecret | null> {
  try {
    const rows = await prisma.$queryRaw<UserAiCredentialRow[]>`
      SELECT "encryptedSecret", "baseUrl", "projectId", "defaultModel"
      FROM "UserAiCredential"
      WHERE "userId" = ${userId} AND "provider" = ${provider}
      LIMIT 1
    `;

    const credential = rows[0];

    if (!credential) return null;

    return applyProviderDefaults({
      provider,
      value: decryptSecret(credential.encryptedSecret),
      baseUrl: credential.baseUrl,
      projectId: credential.projectId,
      defaultModel: credential.defaultModel,
      source: "user",
    });
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
