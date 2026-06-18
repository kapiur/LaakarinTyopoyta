import axios from "axios";
import { upsertGuidelineDocuments } from "../lib/literature/guidelineCache";

const DEFAULT_REQUEST_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8",
  "User-Agent": "Mozilla/5.0 (compatible; LaakarinTyopoyta/1.0; +https://github.com/kapiur/LaakarinTyopoyta)",
};

type MinzdravListItem = {
  Name?: string;
  PublishDateStr?: string;
  CodeVersion?: string;
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/");
}

function stripHtmlTags(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractReadableHtmlText(html: string) {
  const bodyMatch = html.match(/<article[\s\S]*?<\/article>/i)
    ?? html.match(/<main[\s\S]*?<\/main>/i)
    ?? html.match(/<body[\s\S]*?<\/body>/i);

  const relevantHtml = bodyMatch?.[0] ?? html;
  const cleanedHtml = relevantHtml
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ");

  const text = stripHtmlTags(cleanedHtml);
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length >= 60);

  return Array.from(new Set(paragraphs)).join("\n\n").trim();
}

function truncateAtBoundary(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const sliced = value.slice(0, maxLength);
  const lastBreak = Math.max(sliced.lastIndexOf("\n\n"), sliced.lastIndexOf(". "));
  if (lastBreak > Math.floor(maxLength * 0.6)) {
    return sliced.slice(0, lastBreak).trim();
  }
  return sliced.trim();
}

function collectJsonText(node: unknown, output: string[] = [], depth = 0) {
  if (depth > 8 || node == null || output.length >= 120) return output;

  if (typeof node === "string") {
    const text = node.replace(/\s+/g, " ").trim();
    if (text.length >= 40) output.push(text);
    return output;
  }

  if (typeof node === "number" || typeof node === "boolean") {
    return output;
  }

  if (Array.isArray(node)) {
    for (const item of node) collectJsonText(item, output, depth + 1);
    return output;
  }

  if (typeof node !== "object") return output;

  const excludedKeys = new Set([
    "Id",
    "CodeVersion",
    "PrevCrId",
    "PublishDateStr",
    "Created",
    "Updated",
    "Version",
    "Status",
  ]);

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (excludedKeys.has(key)) continue;
    if (/html/i.test(key) && typeof value === "string") {
      const htmlText = truncateAtBoundary(extractReadableHtmlText(value), 5000);
      if (htmlText) output.push(htmlText);
      continue;
    }
    collectJsonText(value, output, depth + 1);
  }

  return output;
}

function buildNormalizedText(value?: string) {
  return value
    ? truncateAtBoundary(
        value
          .replace(/\r/g, "")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .replace(/[ \t]{2,}/g, " ")
          .trim(),
        12000,
      )
    : undefined;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const values: Record<string, string | boolean> = {};

  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const [key, rawValue] = arg.slice(2).split("=");
    values[key] = rawValue === undefined ? true : rawValue;
  }

  const pageSize = Number(values.pageSize ?? 20);
  const maxPages = Number(values.maxPages ?? 3);
  const limit = values.all ? null : Number(values.limit ?? pageSize * maxPages);
  const fromPage = Number(values.fromPage ?? 1);

  return {
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 20,
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : 3,
    limit: limit == null || !Number.isFinite(limit) || limit <= 0 ? null : limit,
    fromPage: Number.isFinite(fromPage) && fromPage > 0 ? fromPage : 1,
  };
}

async function listMinzdravPage(currentPage: number, pageSize: number) {
  const body = {
    filters: [
      {
        fieldName: "status",
        filterType: 1,
        filterValueType: 2,
        value1: 0,
        value2: "",
        values: [],
      },
    ],
    sortOption: {
      fieldName: "publishdate",
      sortType: 2,
    },
    pageSize,
    currentPage,
    useANDoperator: true,
    columns: [],
  };

  const response = await axios.post(
    "https://apicr.minzdrav.gov.ru/api.ashx?op=GetJsonClinrecsFilterV2",
    body,
    {
      timeout: 30000,
      headers: {
        ...DEFAULT_REQUEST_HEADERS,
        "Content-Type": "application/json",
      },
    },
  );

  return {
    items: Array.isArray(response.data?.Data) ? (response.data.Data as MinzdravListItem[]) : [],
    totalRecords: Number(response.data?.TotalRecords ?? 0),
  };
}

async function fetchMinzdravGuidelineDetail(codeVersion: string) {
  const detailUrls = [
    `https://apicr.minzdrav.gov.ru/api.ashx?op=GetClinrec2&id=${encodeURIComponent(codeVersion)}`,
    `https://apiapprovecr.minzdrav.gov.ru/api.ashx?op=GetClinrec2&id=${encodeURIComponent(codeVersion)}`,
  ];

  for (const url of detailUrls) {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          ...DEFAULT_REQUEST_HEADERS,
          Accept: "application/json,text/plain,*/*",
        },
      });

      const rawData = response.data;
      if (typeof rawData === "string") {
        const stripped = truncateAtBoundary(stripHtmlTags(rawData), 6000);
        if (stripped.length >= 400) return stripped;
      }

      const collected = collectJsonText(rawData);
      const joined = truncateAtBoundary(Array.from(new Set(collected)).join("\n\n"), 6000);
      if (joined.length >= 400) return joined;
    } catch (error) {
      console.error(`[detail] failed ${url}`, error);
    }
  }

  const previewUrl = `https://cr.minzdrav.gov.ru/preview-cr/${encodeURIComponent(codeVersion)}`;
  try {
    const response = await axios.get(previewUrl, {
      timeout: 30000,
      headers: DEFAULT_REQUEST_HEADERS,
    });

    const html = typeof response.data === "string" ? response.data : "";
    const previewText = truncateAtBoundary(extractReadableHtmlText(html), 6000);
    if (previewText.length >= 400) return previewText;
  } catch (error) {
    console.error(`[preview] failed ${previewUrl}`, error);
  }

  return "";
}

async function warmRussianGuidelineCache() {
  const options = parseArgs();
  let processed = 0;
  let cached = 0;
  let skipped = 0;
  let failed = 0;
  let discoveredTotal = 0;

  console.log(`[guideline-cache:ru] start pageSize=${options.pageSize} maxPages=${options.maxPages} fromPage=${options.fromPage} limit=${options.limit ?? "all"}`);

  outer:
  for (let page = options.fromPage; page < options.fromPage + options.maxPages; page += 1) {
    console.log(`[guideline-cache:ru] listing page ${page}`);
    const { items, totalRecords } = await listMinzdravPage(page, options.pageSize);
    discoveredTotal = totalRecords;

    if (items.length === 0) {
      console.log(`[guideline-cache:ru] page ${page} returned no items, stop`);
      break;
    }

    for (const item of items) {
      if (options.limit !== null && processed >= options.limit) {
        break outer;
      }

      const codeVersion = String(item.CodeVersion ?? "").trim();
      const title = String(item.Name ?? "").trim();
      if (!codeVersion || !title) {
        skipped += 1;
        continue;
      }

      processed += 1;
      const sourceUrl = `https://cr.minzdrav.gov.ru/preview-cr/${encodeURIComponent(codeVersion)}`;
      console.log(`[guideline-cache:ru] ${processed}. ${codeVersion} :: ${title}`);

      try {
        const text = await fetchMinzdravGuidelineDetail(codeVersion);
        if (!text) {
          failed += 1;
          await upsertGuidelineDocuments([
            {
              sourceId: "ru-minzdrav-clinical-recommendations",
              country: "RU",
              externalId: codeVersion,
              sourceUrl,
              title,
              publishedAt: typeof item.PublishDateStr === "string" ? item.PublishDateStr : undefined,
              rawText: undefined,
              normalizedText: undefined,
              syncStatus: "partial",
            },
          ]);
          continue;
        }

        await upsertGuidelineDocuments([
          {
            sourceId: "ru-minzdrav-clinical-recommendations",
            country: "RU",
            externalId: codeVersion,
            sourceUrl,
            title,
            publishedAt: typeof item.PublishDateStr === "string" ? item.PublishDateStr : undefined,
            rawText: text,
            normalizedText: buildNormalizedText(text),
            syncStatus: "ready",
          },
        ]);
        cached += 1;
      } catch (error) {
        failed += 1;
        console.error(`[guideline-cache:ru] failed ${codeVersion}`, error);
      }
    }
  }

  console.log("[guideline-cache:ru] done");
  console.log(`[guideline-cache:ru] total available in registry: ${discoveredTotal}`);
  console.log(`[guideline-cache:ru] processed: ${processed}`);
  console.log(`[guideline-cache:ru] cached ready: ${cached}`);
  console.log(`[guideline-cache:ru] skipped invalid: ${skipped}`);
  console.log(`[guideline-cache:ru] failed/partial: ${failed}`);
}

warmRussianGuidelineCache()
  .catch((error) => {
    console.error("[guideline-cache:ru] fatal error", error);
    process.exitCode = 1;
  });
