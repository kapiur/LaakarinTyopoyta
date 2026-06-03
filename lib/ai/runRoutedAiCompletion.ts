import { resolveAiRoute, type AiRouteDecision } from './aiRouter';
import { runAiCompletion } from './runAiCompletion';
import type { AiMessage, RunAiCompletionResult } from './providers/types';
import type { AiProfileMode } from './userAiProfile';
import type { AiTaskType } from './taskTypes';

export type RunRoutedAiCompletionInput = {
  userId: number;
  taskType: AiTaskType;
  messages: AiMessage[];
  temperature?: number;
  responseFormat?: 'text' | 'json';
  requestedProfileMode?: AiProfileMode;
};

export type RunRoutedAiCompletionResult = RunAiCompletionResult & {
  route: AiRouteDecision;
};

export async function runRoutedAiCompletion(input: RunRoutedAiCompletionInput): Promise<RunRoutedAiCompletionResult> {
  const route = await resolveAiRoute({
    userId: input.userId,
    taskType: input.taskType,
    requestedProfileMode: input.requestedProfileMode,
  });

  const result = await runAiCompletion({
    userId: input.userId,
    provider: route.provider,
    model: route.model,
    messages: input.messages,
    temperature: input.temperature,
    responseFormat: input.responseFormat,
    taskType: route.taskType,
  });

  return {
    ...result,
    route,
  };
}
