import { DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER, AI_MODEL_REGISTRY } from './modelRegistry';
import { getUserAiSettings } from './userAiSettings';
import type { AiProviderKey } from './providers/types';
import type { AiProfileMode } from './userAiProfile';
import { getAiTaskPolicy, type AiTaskType } from './taskTypes';

export type AiRouteDecision = {
  provider: AiProviderKey;
  model: string;
  profileMode: AiProfileMode;
  taskType: AiTaskType;
  requiresEvidence: boolean;
  safetyLevel: 'none' | 'low' | 'clinical' | 'high';
};

export type ResolveAiRouteInput = {
  userId: number;
  taskType: AiTaskType;
  requestedProvider?: AiProviderKey;
  requestedModel?: string;
  requestedProfileMode?: AiProfileMode;
};

export function profileModeForTask(taskType: AiTaskType): AiProfileMode {
  if (taskType === 'lab_format') return 'none';
  if (taskType === 'text_fix') return 'styleOnly';
  if (taskType === 'translation') return 'styleOnly';
  if (taskType === 'template_generation') return 'styleOnly';
  if (taskType === 'template_polish') return 'styleOnly';
  if (taskType === 'tool_design') return 'workContextOnly';
  if (taskType === 'clinical_reference') return 'workContextOnly';
  if (taskType === 'clinical_guideline_comparison') return 'workContextOnly';
  if (taskType === 'clinical_review') return 'workContextOnly';
  if (taskType === 'clinical_advice') return 'workContextOnly';
  if (taskType === 'clinical_source_check') return 'workContextOnly';
  if (taskType === 'pikaohje_generation') return 'workContextOnly';
  if (taskType === 'pikaohje_review') return 'workContextOnly';
  if (taskType === 'medication_guidance') return 'workContextOnly';
  if (taskType === 'urgent_triage') return 'workContextOnly';
  if (taskType === 'referral_guidance') return 'workContextOnly';
  if (taskType === 'clinical_document') return 'full';
  return 'full';
}

function modelRecommendedForTask(provider: AiProviderKey, taskType: AiTaskType) {
  const providerRegistry = AI_MODEL_REGISTRY[provider];
  if (!providerRegistry) return null;

  return providerRegistry.models.find((model) => model.recommendedFor.includes(taskType))?.id ?? null;
}

export async function resolveAiRoute(input: ResolveAiRouteInput): Promise<AiRouteDecision> {
  const settings = await getUserAiSettings(input.userId);
  const provider = input.requestedProvider ?? settings.defaultProvider ?? DEFAULT_AI_PROVIDER;
  const requestedModel = input.requestedModel ?? settings.defaultModel ?? DEFAULT_AI_MODEL;
  const routedModel = settings.allowAgentModelSelection
    ? modelRecommendedForTask(provider, input.taskType) ?? requestedModel
    : requestedModel;
  const policy = getAiTaskPolicy(input.taskType);

  return {
    provider,
    model: routedModel,
    profileMode: input.requestedProfileMode ?? profileModeForTask(input.taskType),
    taskType: input.taskType,
    requiresEvidence: policy.requiresEvidence,
    safetyLevel: policy.safetyLevel,
  };
}
