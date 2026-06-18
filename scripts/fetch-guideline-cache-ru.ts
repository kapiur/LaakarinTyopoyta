import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fetchRussianGuidelineSnapshot, parseCliFlags, parseFetchOptions } from "./ru-guideline-cache";

function resolveOutputPath(args: string[]) {
  const flags = parseCliFlags(args);
  const output = typeof flags.output === "string" && flags.output.trim()
    ? flags.output.trim()
    : "./tmp/ru-guideline-cache.json";

  return resolve(output);
}

async function fetchGuidelineCacheToFile() {
  const args = process.argv.slice(2);
  const options = parseFetchOptions(args);
  const outputPath = resolveOutputPath(args);
  const { snapshot, stats } = await fetchRussianGuidelineSnapshot(options);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log("[guideline-cache:ru:fetch] file written");
  console.log(`[guideline-cache:ru:fetch] output: ${outputPath}`);
  console.log(`[guideline-cache:ru:fetch] total available in registry: ${stats.discoveredTotal}`);
  console.log(`[guideline-cache:ru:fetch] processed: ${stats.processed}`);
  console.log(`[guideline-cache:ru:fetch] cached ready: ${stats.cachedReady}`);
  console.log(`[guideline-cache:ru:fetch] skipped invalid: ${stats.skippedInvalid}`);
  console.log(`[guideline-cache:ru:fetch] failed/partial: ${stats.failedPartial}`);
}

fetchGuidelineCacheToFile()
  .catch((error) => {
    console.error("[guideline-cache:ru:fetch] fatal error", error);
    process.exitCode = 1;
  });
