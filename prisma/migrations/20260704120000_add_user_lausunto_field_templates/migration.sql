CREATE TABLE "UserLausuntoFieldTemplate" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "mode" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "fields" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserLausuntoFieldTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserLausuntoFieldTemplate_userId_mode_purpose_key" ON "UserLausuntoFieldTemplate"("userId", "mode", "purpose");
CREATE INDEX "UserLausuntoFieldTemplate_userId_idx" ON "UserLausuntoFieldTemplate"("userId");
CREATE INDEX "UserLausuntoFieldTemplate_mode_purpose_idx" ON "UserLausuntoFieldTemplate"("mode", "purpose");

ALTER TABLE "UserLausuntoFieldTemplate"
ADD CONSTRAINT "UserLausuntoFieldTemplate_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
