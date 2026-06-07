ALTER TABLE "UserClinicalSettings"
ADD COLUMN "practiceCountry" TEXT NOT NULL DEFAULT 'FI',
ADD COLUMN "usePracticeCountryDefaults" BOOLEAN NOT NULL DEFAULT true;

UPDATE "UserClinicalSettings"
SET "practiceCountry" = CASE
  WHEN "clinicalCountry" IN ('FI', 'RU') THEN "clinicalCountry"
  ELSE 'FI'
END;

CREATE INDEX IF NOT EXISTS "UserClinicalSettings_practiceCountry_idx"
ON "UserClinicalSettings"("practiceCountry");
