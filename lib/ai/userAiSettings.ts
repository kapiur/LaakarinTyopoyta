import { prisma } from '../prisma';
import { DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER } from './modelRegistry';
import type { AiProviderKey } from './providers/types';

export type AiCredentialMode = 'platform' | 'user' | 'auto';

export type UserAiSettingsRecord = {
  defaultProvider: AiProviderKey;
  defaultModel: string;
  allowAgentModelSelection: boolean;
  credentialMode: AiCredentialMode;
};

export type UserAiAccessPolicyRecord = {
  allowPlatformCredentials: boolean;
  allowUserCredentials: boolean;
  requireUserCredentials: boolean;
  allowedProviders: string[];
  monthlyTokenLimit: number | null;
  monthlyCostLimitCents: number | null;
};

const VALID_CREDENTIAL_MODES = new Set(['platform', 'user', 'auto']);

export function normalizeCredentialMode(value: unknown): AiCredentialMode {
  if (typeof value === 'string' && VALID_CREDENTIAL_MODES.has(value)) return value as AiCredentialMode;
  return 'platform';
}

export function normalizeProvider(value: unknown): AiProviderKey {
  if (value === 'openai' || value === 'google' || value === 'yandex') {
    return value;
  }

  return DEFAULT_AI_PROVIDER;
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

export async function getUserAiSettings(userId: number): Promise<UserAiSettingsRecord> {
  try {
    const rows = await prisma.$queryRaw<Array<{
      defaultProvider: string;
      defaultModel: string;
      allowAgentModelSelection: boolean;
      credentialMode: string;
    }>>`
      SELECT "defaultProvider", "defaultModel", "allowAgentModelSelection", "credentialMode"
      FROM "UserAiSettings"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;

    const row = rows[0];

    if (!row) {
      return {
        defaultProvider: DEFAULT_AI_PROVIDER,
        defaultModel: DEFAULT_AI_MODEL,
        allowAgentModelSelection: true,
        credentialMode: 'platform',
      };
    }

    return {
      defaultProvider: normalizeProvider(row.defaultProvider),
      defaultModel: row.defaultModel || DEFAULT_AI_MODEL,
      allowAgentModelSelection: row.allowAgentModelSelection !== false,
      credentialMode: normalizeCredentialMode(row.credentialMode),
    };
  } catch (error) {
    console.error('User AI settings loading failed, using defaults:', error);
    return {
      defaultProvider: DEFAULT_AI_PROVIDER,
      defaultModel: DEFAULT_AI_MODEL,
      allowAgentModelSelection: true,
      credentialMode: 'platform',
    };
  }
}

export async function getUserAiAccessPolicy(userId: number): Promise<UserAiAccessPolicyRecord> {
  try {
    const rows = await prisma.$queryRaw<Array<{
      allowPlatformCredentials: boolean;
      allowUserCredentials: boolean;
      requireUserCredentials: boolean;
      allowedProviders: string | null;
      monthlyTokenLimit: number | null;
      monthlyCostLimitCents: number | null;
    }>>`
      SELECT "allowPlatformCredentials", "allowUserCredentials", "requireUserCredentials", "allowedProviders", "monthlyTokenLimit", "monthlyCostLimitCents"
      FROM "UserAiAccessPolicy"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;

    const row = rows[0];

    if (!row) {
      return {
        allowPlatformCredentials: true,
        allowUserCredentials: false,
        requireUserCredentials: false,
        allowedProviders: [],
        monthlyTokenLimit: null,
        monthlyCostLimitCents: null,
      };
    }

    return {
      allowPlatformCredentials: row.allowPlatformCredentials !== false,
      allowUserCredentials: row.allowUserCredentials === true,
      requireUserCredentials: row.requireUserCredentials === true,
      allowedProviders: parseAllowedProviders(row.allowedProviders),
      monthlyTokenLimit: row.monthlyTokenLimit,
      monthlyCostLimitCents: row.monthlyCostLimitCents,
    };
  } catch (error) {
    console.error('User AI access policy loading failed, using safe defaults:', error);
    return {
      allowPlatformCredentials: true,
      allowUserCredentials: false,
      requireUserCredentials: false,
      allowedProviders: [],
      monthlyTokenLimit: null,
      monthlyCostLimitCents: null,
    };
  }
}

export function isProviderAllowedForUser(provider: AiProviderKey, policy: UserAiAccessPolicyRecord) {
  return policy.allowedProviders.length === 0 || policy.allowedProviders.includes(provider);
}
