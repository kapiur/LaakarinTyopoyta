import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '../../../lib/admin-auth';
import { sanitizeAgentInputs } from '../../../lib/ai/agent/agentPrivacy';
import { createAgentPlan } from '../../../lib/ai/agent/agentPlanner';
import type { AgentContextType, AgentRequestBody, AgentUiLanguage } from '../../../lib/ai/agent/types';
import { runRoutedAiCompletion } from '../../../lib/ai/runRoutedAiCompletion';
import { taskAllowsRegistryOnlyReference, taskRequiresEvidence } from '../../../lib/ai/taskTypes';
import { buildInitialEvidencePackage, buildNoEvidenceReply, type EvidencePackage }