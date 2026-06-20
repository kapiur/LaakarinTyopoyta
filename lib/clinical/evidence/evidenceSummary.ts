import { prisma } from "../../prisma";
import { getUserClinicalEvidenceConfig } from "./userClinicalSettings";

export type EvidenceSourceSummary = {
  id: string;
  name: string;
  trustLevel: string;
  isOfficial: boolean;
  baseUrl?: string;
  language: string[];
  lastSyncedAt?: string;
};

export type UserEvidenceSummary = {
  practiceCountry: string;
  clinicalCountry: string;
  clinicalOutputLanguage: string;
  evidenceStrictness: "strict" | "balanced" | "local-aware";
  confidenceLevel: "high" | "moderate" | "contextual";
  sources: EvidenceSourceSummary[];
  officialSourceCount: number;
  latestSourceSyncAt?: string;
  guidelineUpdatesSeenAt?: string;
  unreadGuidelineUpdateCount: number;
  hasUnreadGuidelineUpdates: boolean;
};

function confidenceLevelForStrictness(strictness: "strict" | "balanced" | "local-aware") {
  if (strictness === "strict") return "high" as const;
  if (strictness === "balanced") return "moderate" as const;
  return "contextual" as const;
}

export async function getUserEvidenceSummary(userId: number): Promise<UserEvidenceSummary> {
  const [config, settings] = await Promise.all([
    getUserClinicalEvidenceConfig(userId),
    prisma.userClinicalSettings.findUnique({
      where: { userId },
      select: { guidelineUpdatesSeenAt: true },
    }),
  ]);

  const sourceIds = config.allowedSources.map((source) => source.id);
  const groupedSyncRows = sourceIds.length > 0
    ? await prisma.guidelineDocument.groupBy({
        by: ["sourceId"],
        where: {
          country: config.clinicalCountry,
          sourceId: { in: sourceIds },
        },
        _max: {
          lastSyncedAt: true,
        },
      }).catch(() => [])
    : [];

  const syncBySourceId = new Map(
    groupedSyncRows.map((row) => [row.sourceId, row._max.lastSyncedAt ?? null] as const),
  );

  const sources = config.allowedSources.map((source) => {
    const rawLastSyncedAt = syncBySourceId.get(source.id) ?? null;
    const lastSyncedAt = rawLastSyncedAt instanceof Date ? rawLastSyncedAt : null;
    return {
      id: source.id,
      name: source.name,
      trustLevel: source.trustLevel,
      isOfficial: source.isOfficial,
      baseUrl: source.baseUrl,
      language: source.language,
      lastSyncedAt: lastSyncedAt ? lastSyncedAt.toISOString() : undefined,
    };
  });

  const latestSourceSyncAt = sources
    .map((source) => source.lastSyncedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  const guidelineUpdatesSeenAt = settings?.guidelineUpdatesSeenAt?.toISOString();
  const seenAtMs = settings?.guidelineUpdatesSeenAt?.getTime() ?? 0;
  const unreadGuidelineUpdateCount = sources.filter((source) => {
    if (!source.lastSyncedAt) return false;
    return new Date(source.lastSyncedAt).getTime() > seenAtMs;
  }).length;

  return {
    practiceCountry: config.practiceCountry,
    clinicalCountry: config.clinicalCountry,
    clinicalOutputLanguage: config.clinicalOutputLanguage,
    evidenceStrictness: config.evidenceStrictness,
    confidenceLevel: confidenceLevelForStrictness(config.evidenceStrictness),
    sources,
    officialSourceCount: sources.filter((source) => source.isOfficial).length,
    latestSourceSyncAt,
    guidelineUpdatesSeenAt,
    unreadGuidelineUpdateCount,
    hasUnreadGuidelineUpdates: unreadGuidelineUpdateCount > 0,
  };
}
