CREATE TABLE IF NOT EXISTS "UserClinicalSettings" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "clinicalCountry" TEXT NOT NULL DEFAULT 'FI',
  "clinicalOutputLanguage" TEXT NOT NULL DEFAULT 'fi',
  "evidenceStrictness" TEXT NOT NULL DEFAULT 'strict',
  "allowLocalSources" BOOLEAN NOT NULL DEFAULT true,
  "allowSupplementarySources" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserClinicalSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserClinicalSettings_userId_key"
ON "UserClinicalSettings"("userId");

CREATE INDEX IF NOT EXISTS "UserClinicalSettings_clinicalCountry_idx"
ON "UserClinicalSettings"("clinicalCountry");

ALTER TABLE "UserClinicalSettings"
ADD CONSTRAINT "UserClinicalSettings_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ClinicalSource" (
  "id" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sourceType" TEXT NOT NULL,
  "trustLevel" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "baseUrl" TEXT,
  "allowedDomains" JSONB,
  "language" JSONB,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "isOfficial" BOOLEAN NOT NULL DEFAULT false,
  "specialty" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalSource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClinicalSource_country_idx"
ON "ClinicalSource"("country");

CREATE INDEX IF NOT EXISTS "ClinicalSource_sourceType_idx"
ON "ClinicalSource"("sourceType");

CREATE INDEX IF NOT EXISTS "ClinicalSource_trustLevel_idx"
ON "ClinicalSource"("trustLevel");

CREATE INDEX IF NOT EXISTS "ClinicalSource_isEnabled_idx"
ON "ClinicalSource"("isEnabled");

CREATE TABLE IF NOT EXISTS "UserClinicalSourcePreference" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "sourceId" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "priorityOverride" INTEGER,
  "useForAgent" BOOLEAN NOT NULL DEFAULT true,
  "useForPikaohjeet" BOOLEAN NOT NULL DEFAULT true,
  "useForPatientInstructions" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserClinicalSourcePreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserClinicalSourcePreference_userId_sourceId_key"
ON "UserClinicalSourcePreference"("userId", "sourceId");

CREATE INDEX IF NOT EXISTS "UserClinicalSourcePreference_userId_country_idx"
ON "UserClinicalSourcePreference"("userId", "country");

CREATE INDEX IF NOT EXISTS "UserClinicalSourcePreference_sourceId_idx"
ON "UserClinicalSourcePreference"("sourceId");

ALTER TABLE "UserClinicalSourcePreference"
ADD CONSTRAINT "UserClinicalSourcePreference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserClinicalSourcePreference"
ADD CONSTRAINT "UserClinicalSourcePreference_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "ClinicalSource"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
