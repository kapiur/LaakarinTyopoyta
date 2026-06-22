ALTER TABLE "UserAiSettings"
  ADD COLUMN IF NOT EXISTS "assistantResponseMode" TEXT NOT NULL DEFAULT 'request',
  ADD COLUMN IF NOT EXISTS "assistantFixedLanguage" TEXT;
