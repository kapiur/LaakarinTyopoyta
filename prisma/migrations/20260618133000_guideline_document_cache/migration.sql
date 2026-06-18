CREATE TABLE IF NOT EXISTS "GuidelineDocument" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "externalId" TEXT,
  "sourceUrl" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "searchQuery" TEXT,
  "publishedAt" TEXT,
  "rawText" TEXT,
  "normalizedText" TEXT,
  "contentHash" TEXT,
  "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "syncStatus" TEXT NOT NULL DEFAULT 'ready',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuidelineDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GuidelineDocument_sourceId_sourceUrl_key"
ON "GuidelineDocument"("sourceId", "sourceUrl");

CREATE INDEX IF NOT EXISTS "GuidelineDocument_country_lastSyncedAt_idx"
ON "GuidelineDocument"("country", "lastSyncedAt");

CREATE INDEX IF NOT EXISTS "GuidelineDocument_sourceId_country_idx"
ON "GuidelineDocument"("sourceId", "country");

CREATE INDEX IF NOT EXISTS "GuidelineDocument_externalId_idx"
ON "GuidelineDocument"("externalId");
