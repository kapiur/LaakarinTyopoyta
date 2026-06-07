import { resolveAiCredential } from './credentials/resolveAiCredential';
import { isOpenAiCompatibleProvider, normalizeModelForProvider } from './modelRegistry';
import { runOpenAiCompletion } from './providers/openai';
import { getUserAiSettings } from './userAiSettings';
import type { RunAiCompletionInput, RunAiCompletionResult } from './providers/types';

export async function runAiCompletion(input: RunAiCompletionInput): Promise<RunAiCompletionResult> {
  const userSettings = await getUserAiSettings(input.userId);
  const provider = userSettings.defaultProvider || input.provider;
  const requestedModel = userSettings.defaultModel || input.model;
  const secret = await resolveAiCredential({
    userId: input.userId,
    provider,
    credentialMode: userSettings.credentialMode,
  });
  const model = normalizeModelForProvider(provider, secret.defaultModel || requestedModel);

  if (isOpenAiCompatibleProvider(provider)) {
    return runOpenAiCompletion({
      ...input,
      provider,
      model,
      secret,
    });
  }

  throw new Error(`AI provider is not implemented: ${provider}`);
}
