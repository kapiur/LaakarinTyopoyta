import { resolveAiCredential } from './credentials/resolveAiCredential';
import { runOpenAiCompletion } from './providers/openai';
import type { RunAiCompletionInput, RunAiCompletionResult } from './providers/types';

export async function runAiCompletion(input: RunAiCompletionInput): Promise<RunAiCompletionResult> {
  const secret = await resolveAiCredential(input.provider);
  const model = secret.defaultModel || input.model;

  if (input.provider === 'openai') {
    return runOpenAiCompletion({
      ...input,
      model,
      secret,
    });
  }

  throw new Error(`AI provider is not implemented: ${input.provider}`);
}
