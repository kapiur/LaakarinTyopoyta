export const PE_CRITERION_KEYS = [
  "vtesigns",
  "altpe",
  "hr",
  "immobpe",
  "prevpe",
  "hemopt",
  "cancerpe",
] as const;

export type PeCriterionKey = (typeof PE_CRITERION_KEYS)[number];
export type PeCriterionState = Partial<Record<PeCriterionKey, number>> & {
  age?: number;
};
export type PeRiskLevel = "low" | "moderate" | "high";

export type PeAssessment = {
  score: number;
  age: number;
  risk: PeRiskLevel;
  probabilityLabel: string;
  recommendationFi: string;
  dDimerThreshold: string;
};

export function calculatePeScore(criteria: PeCriterionState) {
  return PE_CRITERION_KEYS.reduce((sum, key) => sum + (criteria[key] ?? 0), 0);
}

export function getAgeAdjustedDdimerThreshold(age: number) {
  return age > 50 ? (age / 100).toFixed(1) : "0.5";
}

export function assessPeRisk(score: number, ageInput: number): PeAssessment {
  const age = ageInput > 0 ? ageInput : 50;
  const dDimerThreshold = getAgeAdjustedDdimerThreshold(age);

  if (score > 6) {
    return {
      score,
      age,
      risk: "high",
      probabilityLabel: "~50%",
      recommendationFi: "TT-angiografiaan heti.",
      dDimerThreshold,
    };
  }

  if (score >= 2) {
    return {
      score,
      age,
      risk: "moderate",
      probabilityLabel: "~20%",
      recommendationFi: `D-dimeeri (raja: ${dDimerThreshold}). Jos yli, TT-angio.`,
      dDimerThreshold,
    };
  }

  return {
    score,
    age,
    risk: "low",
    probabilityLabel: "~2%",
    recommendationFi: "D-dimeeri. Jos < 1.0, PE poissuljettu.",
    dDimerThreshold,
  };
}
