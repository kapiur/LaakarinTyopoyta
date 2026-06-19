CREATE TABLE IF NOT EXISTS "UserWorkspaceActivity" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "actionType" TEXT NOT NULL,
  "actionKey" TEXT NOT NULL,
  "useCount" INTEGER NOT NULL DEFAULT 1,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserWorkspaceActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserWorkspaceActivity_userId_actionType_actionKey_key"
  ON "UserWorkspaceActivity"("userId", "actionType", "actionKey");

CREATE INDEX IF NOT EXISTS "UserWorkspaceActivity_userId_lastUsedAt_idx"
  ON "UserWorkspaceActivity"("userId", "lastUsedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'UserWorkspaceActivity_userId_fkey'
  ) THEN
    ALTER TABLE "UserWorkspaceActivity"
      ADD CONSTRAINT "UserWorkspaceActivity_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
