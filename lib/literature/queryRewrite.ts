import { runRoutedAiCompletion } from "../ai/runRoutedAiCompletion";

type RewriteInput = {
  userId: number;
  query: string;
  studyFilter?: string;
};

function looksNonEnglish(value: string) {
  return /[^\x00-\x7F]/.test(value);
}

function safeJsonQuery(content: string) {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return "";

  try {
    const parsed = JSON.parse(trimmed) as { query?: unknown };
    return typeof parsed.query === "string" ? parsed.query.trim() : "";
  } catch {
    return "";
  }
}

function sanitizeQueryCandidate(content: string) {
  const jsonQuery = safeJsonQuery(content);
  if (jsonQuery) return jsonQuery;

  const withoutFences = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstMeaningfulLine = withoutFences
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? "";

  return firstMeaningfulLine
    .replace(/^(pubmed\s+query|search\s+query|query)\s*[:\-]\s*/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();
}

function isUsableRewrittenQuery(candidate: string) {
  if (candidate.length < 3 || candidate.length > 300) return false;
  if (!/[a-z]/i.test(candidate)) return false;
  if (/^i would/i.test(candidate) || /^here is/i.test(candidate)) return false;
  return true;
}

export async function rewriteLiteratureSearchQuery(input: RewriteInput) {
  const query = input.query.trim();
  if (!query || !looksNonEnglish(query)) {
    return query;
  }

  try {
    const result = await runRoutedAiCompletion({
      userId: input.userId,
      taskType: "translation",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: [
            "You rewrite non-English clinical literature questions into compact English PubMed search queries.",
            "Preserve the original meaning conservatively.",
            "Prefer standard medical English terms.",
            "Use AND or OR only when clearly helpful.",
            "Do not explain anything and do not use markdown.",
            "Return one PubMed-ready query line only.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Original query: ${query}`,
            input.studyFilter && input.studyFilter !== "all" ? `Preferred study focus: ${input.studyFilter}` : "",
            "Keep the query concise and suitable for PubMed relevance search.",
          ].filter(Boolean).join("\n"),
        },
      ],
    });

    const rewrittenQuery = sanitizeQueryCandidate(result.content);
    return isUsableRewrittenQuery(rewrittenQuery) ? rewrittenQuery : query;
  } catch (rewriteError) {
    console.error("Literature query rewrite failed:", rewriteError);
    return query;
  }
}
