import { OpenAI } from 'openai';
import type { ProviderCompletionInput, RunAiCompletionResult } from './types';

export async function runOpenAiCompletion(input: ProviderCompletionInput): Promise<RunAiCompletionResult> {
  const client = new OpenAI({
    apiKey: input.secret.value,
    ...(input.secret.baseUrl ? { baseURL: input.secret.baseUrl } : {}),
  });

  const response = await client.chat.completions.create({
    model: input.model,
    messages: input.messages,
    temperature: input.temperature ?? 0,
    ...(input.responseFormat === 'json' ? { response_format: { type: 'json_object' as const } } : {}),
  });

  return {
    content: response.choices[0]?.message?.content ?? '',
    provider: input.provider,
    model: input.model,
    usage: response.usage ? {
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    } : undefined,
  };
}
