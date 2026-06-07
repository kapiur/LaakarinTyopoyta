CREATE TABLE IF NOT EXISTS "UserAiCredential" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "encryptedSecret" TEXT NOT NULL,
  "keyPreview" TEXT,
  "baseUrl" TEXT,
  "defaultModel" TEXT,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserAiCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAiCredential_userId_provider_key"
  ON "UserAiCredential"("userId", "provider");

CREATE INDEX IF NOT EXISTS "UserAiCredential_userId_idx"
  ON "UserAiCredential"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'UserAiCredential_userId_fkey'
  ) THEN
    ALTER TABLE "UserAiCredential"
      ADD CONSTRAINT "UserAiCredential_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
