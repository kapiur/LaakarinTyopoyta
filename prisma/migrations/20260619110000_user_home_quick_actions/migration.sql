CREATE TABLE IF NOT EXISTS "UserHomeQuickAction" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "actionType" TEXT NOT NULL,
  "actionKey" TEXT NOT NULL,
  "customOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserHomeQuickAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserHomeQuickAction_userId_actionType_actionKey_key"
  ON "UserHomeQuickAction"("userId", "actionType", "actionKey");

CREATE INDEX IF NOT EXISTS "UserHomeQuickAction_userId_customOrder_idx"
  ON "UserHomeQuickAction"("userId", "customOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'UserHomeQuickAction_userId_fkey'
  ) THEN
    ALTER TABLE "UserHomeQuickAction"
      ADD CONSTRAINT "UserHomeQuickAction_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
