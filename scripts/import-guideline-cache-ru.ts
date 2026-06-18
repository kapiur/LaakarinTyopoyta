import { readFileSync } from "fs";
import { resolve } from "path";
import { upsertGuidelineDocuments } from "../lib/literature/guidelineCache";
import { parseCliFlags, RU_GUIDELINE_SOURCE_ID, type RuGuidelineCacheRecord, type RuGuidelineCacheSnapshot } from "./ru-guideline-cache";

function resolveInputPath(args: string[]) {
  const flags = parseCliFlags(args);
  const input = typeof flags.input === "string" && flags.input.trim()
    ? flags.input.trim()
    : "./tmp/ru-guideline-cache.json";

  return resolve(input);
}

function parseBatchSize(args: string[]) {
  const flags = parseCliFlags(args);
  const batchSize = Number(flags.batchSize ?? 25);
  return Number.isFinite(batchSize) && batchSize > 0 ? Math.min(batchSize, 100) : 25;
}

function isValidRecord(record: unknown): record is RuGuidelineCacheRecord {
  if (!record || typeof record !== "object") return false;

  const candidate = record as Record<string, unknown>;
  return candidate.sourceId === RU_GUIDELINE_SOURCE_ID
    && candidate.country === "RU"
    && typeof candidate.externalId === "string"
    && typeof candidate.sourceUrl === "string"
    && typeof candidate.title === "string"
    && (candidate.syncStatus === "ready" || candidate.syncStatus === "partial");
}

function readSnapshot(inputPath: string): RuGuidelineCacheSnapshot {
  const raw = readFileSync(inputPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<RuGuidelineCacheSnapshot>;

  if (parsed.format !== "ru-guideline-cache-v1" || !Array.isArray(parsed.items)) {
    throw new Error("Unsupported RU guideline cache file format");
  }

  const invalidIndex = parsed.items.findIndex((item) => !isValidRecord(item));
  if (invalidIndex >= 0) {
    throw new Error(`Invalid record in cache file at index ${invalidIndex}`);
  }

  return parsed as RuGuidelineCacheSnapshot;
}

async function importGuidelineCacheFromFile() {
  const args = process.argv.slice(2);
  const inputPath = resolveInputPath(args);
  const batchSize = parseBatchSize(args);
  const snapshot = readSnapshot(inputPath);

  let imported = 0;
  for (let index = 0; index < snapshot.items.length; index += batchSize) {
    const batch = snapshot.items.slice(index, index + batchSize);
    await upsertGuidelineDocuments(batch);
    imported += batch.length;
    console.log(`[guideline-cache:ru:import] imported ${imported}/${snapshot.items.length}`);
  }

  const readyCount = snapshot.items.filter((item) => item.syncStatus === "ready").length;
  const partialCount = snapshot.items.length - readyCount;

  console.log("[guideline-cache:ru:import] done");
  console.log(`[guideline-cache:ru:import] input: ${inputPath}`);
  console.log(`[guideline-cache:ru:import] imported total: ${snapshot.items.length}`);
  console.log(`[guideline-cache:ru:import] ready: ${readyCount}`);
  console.log(`[guideline-cache:ru:import] partial: ${partialCount}`);
}

importGuidelineCacheFromFile()
  .catch((error) => {
    console.error("[guideline-cache:ru:import] fatal error", error);
    process.exitCode = 1;
  });
