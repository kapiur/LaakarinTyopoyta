-- Per-user AI tools can decide how strongly the personal AI profile is applied.

ALTER TABLE "AiTool"
  ADD COLUMN IF NOT EXISTS "useUserAiProfile" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "AiTool"
  ADD COLUMN IF NOT EXISTS "profileMode" TEXT NOT NULL DEFAULT 'full';

CREATE INDEX IF NOT EXISTS "AiTool_profileMode_idx" ON "AiTool"("profileMode");
