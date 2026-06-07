import type { AiProviderKey } from './providers/types';

export type AiModelRegistryItem = {
  id: string;
  label: string;
  strengths: string[];
  costTier: 'low' | 'medium' | 'high';
  speedTier: 'slow' | 'medium' | 'fast';
  supportsJson: boolean;
  supportsVision: boolean;
  recommendedFor: string[];
};

export type AiProviderRegistryItem = {
  label: string;
  models: AiModelRegistryItem[];
  defaultModel?: string | null;
  openAiCompatibleBaseUrl?: string | null;
};

export const DEFAULT_AI_PROVIDER: AiProviderKey = 'openai';
export const DEFAULT_AI_MODEL = 'gpt-5.4';

export const AI_MODEL_REGISTRY: Record<AiProviderKey, AiProviderRegistryItem> = {
  openai: {
    label: 'OpenAI',
    defaultModel: DEFAULT_AI_MODEL,
    models: [
      {
        id: DEFAULT_AI_MODEL,
        label: 'GPT-5.4',
        strengths: ['clinicalWriting', 'reasoning', 'finnish', 'json'],
        costTier: 'high',
        speedTier: 'medium',
        supportsJson: true,
        supportsVision: false,
        recommendedFor: ['clinical_document', 'clinical_review', 'template_generation', 'prompt_engineering', 'general_chat'],
      },
    ],
  },
  google: {
    label: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    openAiCompatibleBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    models: [
      {
        id: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash',
        strengths: ['speed', 'general_chat', 'summarization', 'cost_efficiency'],
        costTier: 'low',
        speedTier: 'fast',
        supportsJson: true,
        supportsVision: false,
        recommendedFor: ['general_chat', 'clinical_document', 'template_generation', 'prompt_engineering'],
      },
      {
        id: 'gemini-2.5-pro',
        label: 'Gemini 2.5 Pro',
        strengths: ['reasoning', 'long_context', 'analysis', 'clinical_writing'],
        costTier: 'high',
        speedTier: 'medium',
        supportsJson: true,
        supportsVision: false,
        recommendedFor: ['clinical_review', 'clinical_document', 'template_generation', 'general_chat'],
      },
    ],
  },
  yandex: {
    label: 'YandexGPT',
    defaultModel: 'yandexgpt/latest',
    openAiCompatibleBaseUrl: 'https://llm.api.cloud.yandex.net/v1',
    models: [
      {
        id: 'yandexgpt/latest',
        label: 'YandexGPT Latest',
        strengths: ['general_chat', 'russian', 'summarization'],
        costTier: 'medium',
        speedTier: 'medium',
        supportsJson: true,
        supportsVision: false,
        recommendedFor: ['general_chat', 'clinical_document', 'prompt_engineering'],
      },
      {
        id: 'yandexgpt-lite/latest',
        label: 'YandexGPT Lite Latest',
        strengths: ['speed', 'cost_efficiency', 'russian'],
        costTier: 'low',
        speedTier: 'fast',
        supportsJson: true,
        supportsVision: false,
        recommendedFor: ['general_chat', 'template_generation', 'summarization'],
      },
      {
        id: 'yandexgpt/rc',
        label: 'YandexGPT RC',
        strengths: ['reasoning', 'structured_output', 'russian'],
        costTier: 'medium',
        speedTier: 'medium',
        supportsJson: true,
        supportsVision: false,
        recommendedFor: ['clinical_review', 'clinical_document', 'general_chat'],
      },
    ],
  },
};

export function getProviderDefaultModel(provider: AiProviderKey): string {
  return AI_MODEL_REGISTRY[provider]?.defaultModel || DEFAULT_AI_MODEL;
}

export function getProviderOpenAiCompatibleBaseUrl(provider: AiProviderKey): string | null {
  return AI_MODEL_REGISTRY[provider]?.openAiCompatibleBaseUrl || null;
}

export function isOpenAiCompatibleProvider(provider: AiProviderKey): boolean {
  return provider === 'openai' || provider === 'google' || provider === 'yandex';
}

export function normalizeModelForProvider(provider: AiProviderKey, requestedModel?: string | null): string {
  const trimmed = typeof requestedModel === 'string' ? requestedModel.trim() : '';
  const providerDefaultModel = getProviderDefaultModel(provider);

  if (!trimmed) {
    return providerDefaultModel;
  }

  if (provider === 'google' && trimmed === DEFAULT_AI_MODEL) {
    return providerDefaultModel;
  }

  return trimmed;
}

export function buildProviderRuntimeModel(provider: AiProviderKey, model: string, projectId?: string | null): string {
  if (provider !== 'yandex') {
    return model;
  }

  const trimmedModel = model.trim();

  if (trimmedModel.startsWith('gpt://')) {
    return trimmedModel;
  }

  if (!projectId) {
    return trimmedModel;
  }

  return `gpt://${projectId}/${trimmedModel.replace(/^\/+/, '')}`;
}
