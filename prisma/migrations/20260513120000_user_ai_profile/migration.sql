-- User-specific AI profile and anonymized style samples.
-- Raw SQL is used by the first implementation so the feature does not depend on Prisma Client regeneration timing.

CREATE TABLE IF NOT EXISTS "UserAiProfile" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "role" TEXT,
  "specialty" TEXT,
  "workplace" TEXT,
  "experienceLevel" TEXT,
  "defaultClinicalContext" TEXT,
  "preferredStructure" TEXT,
  "detailLevel" TEXT,
  "writingStyle" TEXT,
  "permanentInstructions" TEXT,
  "avoidInstructions" TEXT,
  "styleSummary" TEXT,
  "useProfileByDefault" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserAiProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAiProfile_userId_key" ON "UserAiProfile"("userId");
CREATE INDEX IF NOT EXISTS "UserAiProfile_userId_idx" ON "UserAiProfile"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'UserAiProfile_userId_fkey'
  ) THEN
    ALTER TABLE "UserAiProfile"
      ADD CONSTRAINT "UserAiProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "UserAiProfileSample" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "anonymizedText" TEXT,
  "sourceLabel" TEXT,
  "styleNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserAiProfileSample_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserAiProfileSample_profileId_idx" ON "UserAiProfileSample"("profileId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'UserAiProfileSample_profileId_fkey'
  ) THEN
    ALTER TABLE "UserAiProfileSample"
      ADD CONSTRAINT "UserAiProfileSample_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "UserAiProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
