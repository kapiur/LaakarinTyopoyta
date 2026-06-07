ALTER TABLE "AiProviderCredential"
ADD COLUMN IF NOT EXISTS "projectId" TEXT;

ALTER TABLE "UserAiCredential"
ADD COLUMN IF NOT EXISTS "projectId" TEXT;
