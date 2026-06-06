CREATE TABLE IF NOT EXISTS "AiRunAuditLog" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" INTEGER NOT NULL,
  "surface" TEXT NOT NULL,
  "taskType" TEXT,
  "contextType" TEXT,
  "provider" TEXT,
  "model" TEXT,
  "clinicalCountry" TEXT,
  "evidenceStatus" TEXT,
  "privacyFindingTypes" TEXT NOT NULL DEFAULT '[]',
  "blockedByEvidenceGate" BOOLEAN NOT NULL DEFAULT false,
  "latencyMs" INTEGER,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "errorCode" TEXT,

  CONSTRAINT "AiRunAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiRunAuditLog_userId_createdAt_idx"
ON "AiRunAuditLog"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "AiRunAuditLog_surface_createdAt_idx"
ON "AiRunAuditLog"("surface", "createdAt");

CREATE INDEX IF NOT EXISTS "AiRunAuditLog_taskType_idx"
ON "AiRunAuditLog"("taskType");

CREATE INDEX IF NOT EXISTS "AiRunAuditLog_clinicalCountry_idx"
ON "AiRunAuditLog"("clinicalCountry");

ALTER TABLE "AiRunAuditLog"
ADD CONSTRAINT "AiRunAuditLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
