CREATE TABLE IF NOT EXISTS "AiProviderCredential" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "label" TEXT,
  "encryptedSecret" TEXT NOT NULL,
  "keyPreview" TEXT,
  "baseUrl" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "defaultModel" TEXT,
  "allowedModels" TEXT,
  "lastTestedAt" TIMESTAMP(3),
  "lastTestOk" BOOLEAN,
  "lastTestError" TEXT,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiProviderCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiProviderCredential_provider_key" ON "AiProviderCredential"("provider");
CREATE INDEX IF NOT EXISTS "AiProviderCredential_isEnabled_idx" ON "AiProviderCredential"("isEnabled");
