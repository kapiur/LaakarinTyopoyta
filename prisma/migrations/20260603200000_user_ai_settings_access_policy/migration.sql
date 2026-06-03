CREATE TABLE IF NOT EXISTS "UserAiSettings" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "defaultProvider" TEXT NOT NULL DEFAULT 'openai',
  "defaultModel" TEXT NOT NULL DEFAULT 'gpt-5.4',
  "allowAgentModelSelection" BOOLEAN NOT NULL DEFAULT true,
  "credentialMode" TEXT NOT NULL DEFAULT 'platform',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserAiSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAiSettings_userId_key" ON "UserAiSettings"("userId");
CREATE INDEX IF NOT EXISTS "UserAiSettings_defaultProvider_idx" ON "UserAiSettings"("defaultProvider");
ALTER TABLE "UserAiSettings" ADD CONSTRAINT "UserAiSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "UserAiAccessPolicy" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "allowPlatformCredentials" BOOLEAN NOT NULL DEFAULT true,
  "allowUserCredentials" BOOLEAN NOT NULL DEFAULT false,
  "requireUserCredentials" BOOLEAN NOT NULL DEFAULT false,
  "allowedProviders" TEXT,
  "monthlyTokenLimit" INTEGER,
  "monthlyCostLimitCents" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserAiAccessPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAiAccessPolicy_userId_key" ON "UserAiAccessPolicy"("userId");
CREATE INDEX IF NOT EXISTS "UserAiAccessPolicy_allowPlatformCredentials_idx" ON "UserAiAccessPolicy"("allowPlatformCredentials");
ALTER TABLE "UserAiAccessPolicy" ADD CONSTRAINT "UserAiAccessPolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
