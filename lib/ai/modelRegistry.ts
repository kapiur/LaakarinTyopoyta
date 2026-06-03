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
};

export const DEFAULT_AI_PROVIDER: AiProviderKey = 'openai';
export const DEFAULT_AI_MODEL = 'gpt-5.4';

export const AI_MODEL_REGISTRY: Record<AiProviderKey, AiProviderRegistryItem> = {
  openai: {
    label: 'OpenAI',
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
  anthropic: {
    label: 'Anthropic Claude',
    models: [],
  },
  google: {
    label: 'Google Gemini',
    models: [],
  },
  mistral: {
    label: 'Mistral',
    models: [],
  },
  customOpenAiCompatible: {
    label: 'Custom OpenAI-compatible API',
    models: [],
  },
};
