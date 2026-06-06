CREATE TABLE IF NOT EXISTS "UserCalculatorPreference" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "calculatorKey" TEXT NOT NULL,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserCalculatorPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserCalculatorPreference_userId_calculatorKey_key"
  ON "UserCalculatorPreference"("userId", "calculatorKey");

CREATE INDEX IF NOT EXISTS "UserCalculatorPreference_userId_idx"
  ON "UserCalculatorPreference"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'UserCalculatorPreference_userId_fkey'
  ) THEN
    ALTER TABLE "UserCalculatorPreference"
      ADD CONSTRAINT "UserCalculatorPreference_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
