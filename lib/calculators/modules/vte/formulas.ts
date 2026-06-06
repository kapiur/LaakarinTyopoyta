export const VTE_CRITERION_KEYS = [
  "cancer",
  "immob",
  "bed",
  "tend",
  "whole",
  "calf",
  "pitt",
  "veins",
  "prev",
  "alt",
] as const;

export type VteCriterionKey = (typeof VTE_CRITERION_KEYS)[number];
export type VteCriterionState = Partial<Record<VteCriterionKey, number>>;
export type VteRiskLevel = "low" | "moderate" | "high";

export type VteAssessment = {
  score: number;
  risk: VteRiskLevel;
  probabilityLabel: string;
  recommendationFi: string;
};

export function calculateVteScore(criteria: VteCriterionState) {
  return VTE_CRITERION_KEYS.reduce((sum, key) => sum + (criteria[key] ?? 0), 0);
}

export function assessVteRisk(score: number): VteAssessment {
  if (score >= 3) {
    return {
      score,
      risk: "high",
      probabilityLabel: "~75%",
      recommendationFi: "Suoraan ultraäänitutkimukseen (UÄ).",
    };
  }

  if (score >= 1) {
    return {
      score,
      risk: "moderate",
      probabilityLabel: "~17%",
      recommendationFi: "Tutki D-dimeeri. Jos koholla, etene UÄ:hyn.",
    };
  }

  return {
    score,
    risk: "low",
    probabilityLabel: "~3%",
    recommendationFi: "Tutki D-dimeeri. Jos < 0.5 mg/l, ТГВ epätodennäköinen.",
  };
}
