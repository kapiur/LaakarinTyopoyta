ALTER TABLE "UserClinicalSettings"
ADD COLUMN "guidelineUpdatesSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "FeedbackReport" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "surface" TEXT NOT NULL,
  "contextType" TEXT,
  "feedbackType" TEXT NOT NULL,
  "title" TEXT,
  "comment" TEXT NOT NULL,
  "pagePath" TEXT,
  "sourceLabel" TEXT,
  "sourceUrl" TEXT,
  "clinicalCountry" TEXT,
  "uiLanguage" TEXT,
  "metadata" JSONB,
  "status" TEXT NOT NULL DEFAULT 'new',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FeedbackReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeedbackReport_userId_createdAt_idx" ON "FeedbackReport"("userId", "createdAt");
CREATE INDEX "FeedbackReport_surface_status_createdAt_idx" ON "FeedbackReport"("surface", "status", "createdAt");

ALTER TABLE "FeedbackReport"
ADD CONSTRAINT "FeedbackReport_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
