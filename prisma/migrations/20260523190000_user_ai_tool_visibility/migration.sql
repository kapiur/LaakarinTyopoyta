-- Per-user visibility settings for default dashboard AI tools.
-- Existing users and existing AI tools are not modified.
-- Missing row means the default tool remains visible.

CREATE TABLE IF NOT EXISTS "UserAiToolVisibility" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "toolKey" TEXT NOT NULL,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserAiToolVisibility_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAiToolVisibility_userId_toolKey_key"
  ON "UserAiToolVisibility"("userId", "toolKey");

CREATE INDEX IF NOT EXISTS "UserAiToolVisibility_userId_idx"
  ON "UserAiToolVisibility"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'UserAiToolVisibility_userId_fkey'
  ) THEN
    ALTER TABLE "UserAiToolVisibility"
      ADD CONSTRAINT "UserAiToolVisibility_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
