import type { AgentContextType, AgentPlan, AgentSuggestedAction } from './types';
import type { AiTaskType } from '../taskTypes';

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

const redFlagTerms = [
  'red flag', 'red flags', 'hälyttävä oire', 'hälyttävät oireet', 'hälytysmerkki', 'hälytysmerkit',
  'alarm symptom', 'alarm symptoms', 'warning