-- Add role enum for user administration
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- Add administrative fields to existing users
ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastLoginAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Promote the oldest existing user to ADMIN.
-- This preserves the closed model: after migration, there is exactly one initial administrator.
UPDATE "User"
SET "role" = 'ADMIN'
WHERE "id" = (
  SELECT "id"
  FROM "User"
  ORDER BY "createdAt" ASC, "id" ASC
  LIMIT 1
);
