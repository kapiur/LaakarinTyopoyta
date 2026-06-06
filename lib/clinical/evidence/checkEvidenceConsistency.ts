import type { AiTaskType } from '../../ai/taskTypes';
import type { EvidencePackage } from './evidencePackage';

type ConsistencyCheckResult = {
  unsupportedClaims: string[];
  warnings: string[];
};

const STOP_WORDS = new Set([
  'and', 'the', 'for', 'with', 'that', 'this', 'from', 'into', 'over', 'under', 'than',
  'että', 'tämä', 'tuo', 'joka', 'ovat', 'voidaan', 'kanssa', 'ilman', 'sekä', 'että',
  'что', 'это', 'как', 'для', 'или', 'при', 'если', 'только', 'нужно', 'можно',
]);

const RISK_PATTERNS = [
  /\b\d+(?:[.,]\d+)?\s?(?:mg|g|mcg|µg|ml|mmhg|mmol\/l|bpm|vrk|x\/vrk|times\/day|krt\/vrk)\b/i,
  /\b(?:dose|dosage|annos|доза|target|tavoite|целев|duration|kesto|длительность)\b/i,
  /\b(?:red flag|red flags|hälytt|alarm symptom|warning sign|красн\w*\s+флаг)\b/i,
  /\b(?:referral|lähete|направ|contraindication|kontraindikaatio|противопоказ)\b/i,
  /\b(?:always|never|aina|ei koskaan|всегда|никогда)\b/i,
  /\b(?:finland|suomi|käypä hoito|russia|росси|минздрав|minzdrav)\b/i,
];

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/\r\n/g, '\n')
    .replace(/[^a-z0-9а-яёäöå\s.%/:-]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIntoSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24);
}

function extractRiskyClaims(text: string) {
  return splitIntoSentences(text)
    .filter((sentence) => RISK_PATTERNS.some((pattern) => pattern.test(sentence)))
    .slice(0, 8);
}

function tokenize(sentence: string) {
  return normalizeText(sentence)
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function claimLooksSupported(claim: string, evidenceCorpus: string) {
  const tokens = tokenize(claim);
  if (tokens.length === 0) return true;
  const matchedTokens = tokens.filter((token) => evidenceCorpus.includes(token));
  const ratio = matchedTokens.length / tokens.length;
  return ratio >= 0.6 || (tokens.length <= 4 && matchedTokens.length >= 2);
}

function consistencyWarning(language: string) {
  if (language === 'ru') {
    return 'Ответ содержит клинические утверждения, которые не удалось достаточно уверенно сопоставить с retrieved evidence. Их нужно проверить вручную по источнику.';
  }

  if (language === 'fi') {
    return 'Vastaus sisältää kliinisiä väitteitä, joita ei pystytty riittävän varmasti yhdistämään haettuun evidence-aineistoon. Tarkista ne käsin lähteestä.';
  }

  return 'The answer contains clinical claims that could not be matched confidently to the retrieved evidence. Review them manually against the source.';
}

export function checkEvidenceConsistency(input: {
  taskType: AiTaskType;
  answer: string;
  evidence: EvidencePackage;
  language: string;
}): ConsistencyCheckResult {
  const riskyClaims = extractRiskyClaims(input.answer);
  if (riskyClaims.length === 0) {
    return { unsupportedClaims: [], warnings: [] };
  }

  const evidenceCorpus = normalizeText(input.evidence.excerpts.map((excerpt) => excerpt.text).join('\n\n'));
  const unsupportedClaims =
    evidenceCorpus.length === 0
      ? riskyClaims
      : riskyClaims.filter((claim) => !claimLooksSupported(claim, evidenceCorpus));

  if (unsupportedClaims.length === 0) {
    return { unsupportedClaims: [], warnings: [] };
  }

  return {
    unsupportedClaims,
    warnings: [consistencyWarning(input.language)],
  };
}
