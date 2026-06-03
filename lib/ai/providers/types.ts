export type AiProviderKey = 'openai' | 'anthropic' | 'google' | 'mistral' | 'customOpenAiCompatible';

export type AiMessageRole = 'system' | 'user' | 'assistant';

export type AiMessage = {
  role: AiMessageRole;
  content: string;
};

export type AiResponseFormat = 'text' | 'json';

export type AiSecretSource = 'env' | 'platform' | 'user';

export type AiProviderSecret = {
  provider: AiProviderKey;
  value: string;
  baseUrl?: string | null;
  source?: AiSecretSource;
};

export type RunAiCompletionInput = {
  userId: number;
  provider: AiProviderKey;
  model: string;
  messages: AiMessage[];
  temperature?: number;
  responseFormat?: AiResponseFormat;
  taskType?: string;
};

export type ProviderCompletionInput = RunAiCompletionInput & {
  secret: AiProviderSecret;
};

export type RunAiCompletionResult = {
  content: string;
  provider: AiProviderKey;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};
