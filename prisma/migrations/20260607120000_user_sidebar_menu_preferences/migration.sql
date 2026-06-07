CREATE TABLE IF NOT EXISTS "SidebarMenuPreference" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "itemKey" TEXT NOT NULL,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "customOrder" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SidebarMenuPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SidebarMenuPreference_userId_itemKey_key"
  ON "SidebarMenuPreference"("userId", "itemKey");

CREATE INDEX IF NOT EXISTS "SidebarMenuPreference_userId_idx"
  ON "SidebarMenuPreference"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'SidebarMenuPreference_userId_fkey'
  ) THEN
    ALTER TABLE "SidebarMenuPreference"
      ADD CONSTRAINT "SidebarMenuPreference_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
