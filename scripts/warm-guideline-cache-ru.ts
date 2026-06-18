import { upsertGuidelineDocuments } from "../lib/literature/guidelineCache";
import { fetchRussianGuidelineSnapshot, parseFetchOptions } from "./ru-guideline-cache";

async function warmRussianGuidelineCache() {
  const options = parseFetchOptions(process.argv.slice(2));
  const { snapshot, stats } = await fetchRussianGuidelineSnapshot(options);

  await upsertGuidelineDocuments(snapshot.items);

  console.log("[guideline-cache:ru] done");
  console.log(`[guideline-cache:ru] total available in registry: ${stats.discoveredTotal}`);
  console.log(`[guideline-cache:ru] processed: ${stats.processed}`);
  console.log(`[guideline-cache:ru] cached ready: ${stats.cachedReady}`);
  console.log(`[guideline-cache:ru] skipped invalid: ${stats.skippedInvalid}`);
  console.log(`[guideline-cache:ru] failed/partial: ${stats.failedPartial}`);
}

warmRussianGuidelineCache()
  .catch((error) => {
    console.error("[guideline-cache:ru] fatal error", error);
    process.exitCode = 1;
  });
