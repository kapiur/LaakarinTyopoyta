import { randomUUID } from 'crypto';
import { prisma } from '../../prisma';

export type LogAiRunAuditInput = {
  userId: number;
  surface: 'agent' | 'chat';
  taskType?: string | null;
  contextType?: string | null;
  provider?: string | null;
  model?: string | null;
  clinicalCountry?: string | null;
  evidenceStatus?: string | null;
  privacyFindingTypes?: string[];
  blockedByEvidenceGate?: boolean;
  latencyMs?: number | null;
  success: boolean;
  errorCode?: string | null;
};

export async function logAiRunAudit(input: LogAiRunAuditInput) {
  try {
    await prisma.$executeRaw`
      INSERT INTO "AiRunAuditLog" (
        "id",
        "userId",
        "surface",
        "taskType",
        "contextType",
        "provider",
        "model",
        "clinicalCountry",
        "evidenceStatus",
        "privacyFindingTypes",
        "blockedByEvidenceGate",
        "latencyMs",
        "success",
        "errorCode"
      )
      VALUES (
        ${randomUUID()},
        ${input.userId},
        ${input.surface},
        ${input.taskType ?? null},
        ${input.contextType ?? null},
        ${input.provider ?? null},
        ${input.model ?? null},
        ${input.clinicalCountry ?? null},
        ${input.evidenceStatus ?? null},
        ${JSON.stringify(input.privacyFindingTypes ?? [])},
        ${input.blockedByEvidenceGate ?? false},
        ${input.latencyMs ?? null},
        ${input.success},
        ${input.errorCode ?? null}
      )
    `;
  } catch (error) {
    // Logging must never break the user-facing AI flow. The table may be missing
    // before prisma migrate deploy has been executed in the target environment.
    console.error('AI audit logging failed:', error);
  }
}
