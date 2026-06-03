import { runOpenAiCompletion } from './providers/openai';
import type { AiProviderSecret, RunAiCompletionInput, RunAiCompletionResult } from './providers/types';

function resolveEnvSecret(provider: RunAiCompletionInput['provider']): AiProviderSecret {
  if (provider === 'openai') {
    const value = process.env.OPENAI_API_KEY;

    if (!value) {
      throw new Error('OpenAI API key is not configured');
    }

    return {
      provider,
      value,
      source: 'env',
    };
  }

  throw new Error(`AI provider is not configured: ${provider}`);
}

export async function runAiCompletion(input: RunAiCompletionInput): Promise<RunAiCompletionResult> {
  const secret = resolveEnvSecret(input.provider);

  if (input.provider === 'openai') {
    return runOpenAiCompletion({
      ...input,
      secret,
    });
  }

  throw new Error(`AI provider is not implemented: ${input.provider}`);
}
