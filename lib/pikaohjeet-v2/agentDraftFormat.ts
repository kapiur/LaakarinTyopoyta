export type PikaohjeAgentSection = {
  key: string;
  title: string;
  content: string;
  order: number;
  kind: string;
};

export type PikaohjeAgentDraft = {
  title: string;
  description?: string;
  type: "CLINICAL";
  status: string;
  visibility: "PUBLIC";
  sourceStatus: string;
  environment?: string;
  audience?: string;
  tags: string[];
  sections: PikaohjeAgentSection[];
};

function cleanLineValue(value: string) {
  return value.trim();
}

function normalizeSectionOrders(sections: PikaohjeAgentSection[]) {
  return sections.map((section, index) => ({
    ...section,
    order: (index + 1) * 10,
  }));
}

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}

function sliceFromStructuredStart(text: string) {
  const start = text.search(/^TITLE:\s*/m);
  return start >= 0 ? text.slice(start).trim() : text.trim();
}

function readField(lines: string[], key: string) {
  const prefix = `${key}:`;
  const line = lines.find((item) => item.startsWith(prefix));
  if (!line) return "";
  return cleanLineValue(line.slice(prefix.length));
}

function parseSections(text: string, fallback: PikaohjeAgentDraft) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sections: PikaohjeAgentSection[] = [];
  let index = 0;

  while (index < lines.length) {
    if (!/^SECTION\s+\d+\s*$/i.test(lines[index].trim())) {
      index += 1;
      continue;
    }

    const sectionNumber = sections.length + 1;
    index += 1;

    let key = "";
    let title = "";
    let kind = "";

    while (index < lines.length && lines[index].trim() !== "CONTENT:") {
      const line = lines[index].trim();
      if (line.startsWith("KEY:")) key = cleanLineValue(line.slice(4));
      if (line.startsWith("TITLE:")) title = cleanLineValue(line.slice(6));
      if (line.startsWith("KIND:")) kind = cleanLineValue(line.slice(5));
      if (/^SECTION\s+\d+\s*$/i.test(line)) break;
      index += 1;
    }

    if (index < lines.length && lines[index].trim() === "CONTENT:") {
      index += 1;
    }

    const contentLines: string[] = [];
    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();
      if (trimmed === "---END SECTION---") {
        index += 1;
        break;
      }
      if (/^SECTION\s+\d+\s*$/i.test(trimmed)) break;
      contentLines.push(line);
      index += 1;
    }

    const fallbackSection = fallback.sections[sectionNumber - 1];
    sections.push({
      key: key || fallbackSection?.key || `section_${sectionNumber}`,
      title: title || fallbackSection?.title || `Section ${sectionNumber}`,
      kind: kind || fallbackSection?.kind || "TEXT",
      content: contentLines.join("\n").trim(),
      order: sectionNumber * 10,
    });
  }

  return sections.filter((section) => section.content || section.title);
}

export function serializePikaohjeDraftForAgent(draft: PikaohjeAgentDraft) {
  const parts = [
    `TITLE: ${draft.title}`,
    `DESCRIPTION: ${draft.description || ""}`,
    `STATUS: ${draft.status}`,
    `SOURCE_STATUS: ${draft.sourceStatus}`,
    `ENVIRONMENT: ${draft.environment || ""}`,
    `AUDIENCE: ${draft.audience || ""}`,
    `TAGS: ${(draft.tags || []).join(", ")}`,
    "",
  ];

  const sections = normalizeSectionOrders(draft.sections || []).map((section, index) => [
    `SECTION ${index + 1}`,
    `KEY: ${section.key}`,
    `TITLE: ${section.title}`,
    `KIND: ${section.kind || "TEXT"}`,
    "CONTENT:",
    section.content || "",
    "---END SECTION---",
  ].join("\n"));

  return [...parts, ...sections].join("\n").trim();
}

export function buildPikaohjeAgentTemplate() {
  return [
    "If you return an updated pikaohje draft, keep this exact plain-text structure.",
    "Do not add commentary inside the draft body.",
    "Use existing values when you do not intend to change them.",
    "",
    "TITLE: <card title>",
    "DESCRIPTION: <short description>",
    "STATUS: <existing status>",
    "SOURCE_STATUS: <existing source status>",
    "ENVIRONMENT: <existing environment>",
    "AUDIENCE: <existing audience>",
    "TAGS: <comma-separated tags>",
    "",
    "SECTION 1",
    "KEY: <stable_section_key>",
    "TITLE: <section title>",
    "KIND: <TEXT|WARNING|CRITERIA|ACTIONS|COPY_TEXT|SOURCES>",
    "CONTENT:",
    "<section content>",
    "---END SECTION---",
    "",
    "Add SECTION 2, SECTION 3 and so on when needed.",
  ].join("\n");
}

export function parsePikaohjeAgentDraft(text: string, fallback: PikaohjeAgentDraft): PikaohjeAgentDraft {
  const normalized = sliceFromStructuredStart(stripCodeFence(text));
  const lines = normalized.replace(/\r\n/g, "\n").split("\n").map((line) => line.trimEnd());
  const title = readField(lines, "TITLE");
  const sections = parseSections(normalized, fallback);

  if (!title || sections.length === 0) {
    throw new Error("Agent draft does not match the expected pikaohje format.");
  }

  const description = readField(lines, "DESCRIPTION");
  const status = readField(lines, "STATUS");
  const sourceStatus = readField(lines, "SOURCE_STATUS");
  const environment = readField(lines, "ENVIRONMENT");
  const audience = readField(lines, "AUDIENCE");
  const tagLine = readField(lines, "TAGS");

  return {
    title,
    description: description || fallback.description || "",
    type: "CLINICAL",
    visibility: "PUBLIC",
    status: status || fallback.status,
    sourceStatus: sourceStatus || fallback.sourceStatus,
    environment: environment || fallback.environment || "",
    audience: audience || fallback.audience || "",
    tags: tagLine
      ? tagLine.split(",").map((item) => item.trim()).filter(Boolean)
      : fallback.tags || [],
    sections: normalizeSectionOrders(sections),
  };
}
