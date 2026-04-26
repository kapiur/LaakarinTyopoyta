-- Add PEDS drug library support.
-- This migration is additive only: it creates new enums and tables without modifying existing data.

CREATE TYPE "PedsDrugForm" AS ENUM ('LIQUID', 'TABLET');
CREATE TYPE "PedsDoseUnit" AS ENUM ('MG', 'IU');

CREATE TABLE "PedsIndication" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedsIndication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PedsDrug" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "form" "PedsDrugForm" NOT NULL,
    "unit" "PedsDoseUnit" NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "dosePerKgDay" DOUBLE PRECISION NOT NULL,
    "timesPerDay" INTEGER NOT NULL,
    "defaultDays" INTEGER,
    "packageSize" DOUBLE PRECISION,
    "note" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedsDrug_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PedsDrugIndication" (
    "drugId" INTEGER NOT NULL,
    "indicationId" INTEGER NOT NULL,

    CONSTRAINT "PedsDrugIndication_pkey" PRIMARY KEY ("drugId", "indicationId")
);

CREATE UNIQUE INDEX "PedsIndication_userId_name_key" ON "PedsIndication"("userId", "name");
CREATE INDEX "PedsIndication_userId_idx" ON "PedsIndication"("userId");

CREATE UNIQUE INDEX "PedsDrug_userId_name_form_strength_key" ON "PedsDrug"("userId", "name", "form", "strength");
CREATE INDEX "PedsDrug_userId_idx" ON "PedsDrug"("userId");

CREATE INDEX "PedsDrugIndication_indicationId_idx" ON "PedsDrugIndication"("indicationId");

ALTER TABLE "PedsIndication"
    ADD CONSTRAINT "PedsIndication_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PedsDrug"
    ADD CONSTRAINT "PedsDrug_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PedsDrugIndication"
    ADD CONSTRAINT "PedsDrugIndication_drugId_fkey"
    FOREIGN KEY ("drugId") REFERENCES "PedsDrug"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PedsDrugIndication"
    ADD CONSTRAINT "PedsDrugIndication_indicationId_fkey"
    FOREIGN KEY ("indicationId") REFERENCES "PedsIndication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
