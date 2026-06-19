import { createHash } from "crypto";
import { prisma } from "../prisma";
import type { ClinicalCountryCode } from "../clinical/countries/countryRegistry";

export type CachedGuidelineDocument = {
  id: string;
  sourceId: string;
  country: ClinicalCountryCode;
  externalId?: string;
  sourceUrl: string;
  title: string;
  searchQuery?: string;
  publishedAt?: string;
  rawText?: string;
  normalizedText?: string;
  contentHash?: string;
  retrievedAt: Date;
  lastSyncedAt: Date;
  syncStatus: string;
};

export type UpsertGuidelineDocumentInput = {
  sourceId: string;
  country: ClinicalCountryCode;
  externalId?: string;
  sourceUrl: string;
  title: string;
  searchQuery?: string;
  publishedAt?: string;
  rawText?: string;
  normalizedText?: string;
  syncStatus?: string;
};

type GuidelineDocumentRow = {
  id: string;
  sourceId: string;
  country: string;
  externalId: string | null;
  sourceUrl: string;
  title: string;
  searchQuery: string | null;
  publishedAt: string | null;
  rawText: string | null;
  normalizedText: string | null;
  contentHash: string | null;
  retrievedAt: Date;
  lastSyncedAt: Date;
  syncStatus: string;
};

function normalizeCountry(value: string): ClinicalCountryCode {
  if (value === "RU" || value === "DE") return value;
  return "FI";
}

function mapRow(row: GuidelineDocumentRow): CachedGuidelineDocument {
  return {
    id: row.id,
    sourceId: row.sourceId,
    country: normalizeCountry(row.country),
    externalId: row.externalId ?? undefined,
    sourceUrl: row.sourceUrl,
    title: row.title,
    searchQuery: row.searchQuery ?? undefined,
    publishedAt: row.publishedAt ?? undefined,
    rawText: row.rawText ?? undefined,
    normalizedText: row.normalizedText ?? undefined,
    contentHash: row.contentHash ?? undefined,
    retrievedAt: row.retrievedAt,
    lastSyncedAt: row.lastSyncedAt,
    syncStatus: row.syncStatus,
  };
}

function buildDocumentId(sourceId: string, sourceUrl: string) {
  return createHash("sha256").update(`${sourceId}|${sourceUrl}`).digest("hex").slice(0, 32);
}

function buildContentHash(rawText?: string, normalizedText?: string) {
  const material = `${rawText ?? ""}\n---\n${normalizedText ?? ""}`.trim();
  if (!material) return undefined;
  return createHash("sha256").update(material).digest("hex");
}

export async function upsertGuidelineDocuments(documents: UpsertGuidelineDocumentInput[]) {
  for (const document of documents) {
    const normalizedText = document.normalizedText ?? document.rawText ?? undefined;
    const contentHash = buildContentHash(document.rawText, normalizedText);

    await prisma.$executeRaw`
      INSERT INTO "GuidelineDocument" (
        "id",
        "sourceId",
        "country",
        "externalId",
        "sourceUrl",
        "title",
        "searchQuery",
        "publishedAt",
        "rawText",
        "normalizedText",
        "contentHash",
        "retrievedAt",
        "lastSyncedAt",
        "syncStatus",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${buildDocumentId(document.sourceId, document.sourceUrl)},
        ${document.sourceId},
        ${document.country},
        ${document.externalId ?? null},
        ${document.sourceUrl},
        ${document.title},
        ${document.searchQuery ?? null},
        ${document.publishedAt ?? null},
        ${document.rawText ?? null},
        ${normalizedText ?? null},
        ${contentHash ?? null},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        ${document.syncStatus ?? "ready"},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("sourceId", "sourceUrl")
      DO UPDATE SET
        "externalId" = EXCLUDED."externalId",
        "title" = EXCLUDED."title",
        "searchQuery" = COALESCE(EXCLUDED."searchQuery", "GuidelineDocument"."searchQuery"),
        "publishedAt" = COALESCE(EXCLUDED."publishedAt", "GuidelineDocument"."publishedAt"),
        "rawText" = COALESCE(EXCLUDED."rawText", "GuidelineDocument"."rawText"),
        "normalizedText" = COALESCE(EXCLUDED."normalizedText", "GuidelineDocument"."normalizedText"),
        "contentHash" = COALESCE(EXCLUDED."contentHash", "GuidelineDocument"."contentHash"),
        "lastSyncedAt" = CURRENT_TIMESTAMP,
        "syncStatus" = EXCLUDED."syncStatus",
        "updatedAt" = CURRENT_TIMESTAMP
    `;
  }
}

export async function findCachedGuidelineDocuments(input: {
  country: ClinicalCountryCode;
  sourceIds: string[];
  limit?: number;
}) {
  if (input.sourceIds.length === 0) return [];

  const sourceIdPlaceholders = input.sourceIds.map((_, index) => `$${index + 2}`).join(", ");
  const limitPlaceholder = `$${input.sourceIds.length + 2}`;
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        "id",
        "sourceId",
        "country",
        "externalId",
        "sourceUrl",
        "title",
        "searchQuery",
        "publishedAt",
        "rawText",
        "normalizedText",
        "contentHash",
        "retrievedAt",
        "lastSyncedAt",
        "syncStatus"
      FROM "GuidelineDocument"
      WHERE "country" = $1
        AND "sourceId" IN (${sourceIdPlaceholders})
      ORDER BY "lastSyncedAt" DESC
      LIMIT ${limitPlaceholder}
    `,
    input.country,
    ...input.sourceIds,
    input.limit ?? 40,
  )) as GuidelineDocumentRow[];

  return rows.map(mapRow);
}

export function scoreCachedGuidelineDocuments(documents: CachedGuidelineDocument[], queryTerms: string[]) {
  return documents
    .map((document) => {
      const haystack = `${document.title}\n${document.normalizedText ?? document.rawText ?? ""}`.toLowerCase();
      const score = queryTerms.reduce((count, term) => {
        return haystack.includes(term.toLowerCase()) ? count + 1 : count;
      }, 0);

      return {
        document,
        score,
      };
    })
    .filter((item) => item.score > 0 || queryTerms.length === 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return right.document.lastSyncedAt.getTime() - left.document.lastSyncedAt.getTime();
    })
    .map((item) => item.document);
}
