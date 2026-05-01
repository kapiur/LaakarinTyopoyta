-- Add a per-user interface language preference.
-- This is additive only: no existing rows or tables are removed.
ALTER TABLE "User" ADD COLUMN "uiLanguage" TEXT NOT NULL DEFAULT 'fi';
