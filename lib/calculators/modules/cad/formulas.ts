export type CadSex = "male" | "female";
export type CadSymptomType = "typical" | "atypical" | "other";
export type CadAgeRange = "30-39" | "40-49" | "50-59" | "60-69" | "70-80";
export type CadFactorKey = "family" | "smoking" | "dyslipidemia" | "diabetes" | "hypertension";

export type CadState = {
  ageRange: CadAgeRange;
  sex: CadSex;
  symptoms: CadSymptomType;
  factors: Record<CadFactorKey, boolean>;
};

export type CadAssessment = {
  probability: number;
  factorCount: number;
  factorBucket: "0-1" | "2-3" | "4-5";
  riskLevel: "low" | "elevated";
};

const CAD_MATRIX: Record<
  CadSex,
  Record<CadSymptomType, Record<CadAgeRange, Record<"0-1" | "2-3" | "4-5", number>>>
> = {
  male: {
    typical: {
      "30-39": { "0-1": 9, "2-3": 14, "4-5": 22 },
      "40-49": { "0-1": 14, "2-3": 20, "4-5": 27 },
      "50-59": { "0-1": 21, "2-3": 27, "4-5": 33 },
      "60-69": { "0-1": 32, "2-3": 35, "4-5": 39 },
      "70-80": { "0-1": 44, "2-3": 44, "4-5": 45 },
    },
    atypical: {
      "30-39": { "0-1": 2, "2-3": 4, "4-5": 8 },
      "40-49": { "0-1": 3, "2-3": 6, "4-5": 12 },
      "50-59": { "0-1": 6, "2-3": 11, "4-5": 17 },
      "60-69": { "0-1": 12, "2-3": 17, "4-5": 25 },
      "70-80": { "0-1": 22, "2-3": 27, "4-5": 34 },
    },
    other: {
      "30-39": { "0-1": 1, "2-3": 2, "4-5": 5 },
      "40-49": { "0-1": 2, "2-3": 4, "4-5": 8 },
      "50-59": { "0-1": 4, "2-3": 7, "4-5": 12 },
      "60-69": { "0-1": 8, "2-3": 12, "4-5": 17 },
      "70-80": { "0-1": 15, "2-3": 19, "4-5": 24 },
    },
  },
  female: {
    typical: {
      "30-39": { "0-1": 2, "2-3": 5, "4-5": 10 },
      "40-49": { "0-1": 4, "2-3": 7, "4-5": 12 },
      "50-59": { "0-1": 6, "2-3": 10, "4-5": 15 },
      "60-69": { "0-1": 10, "2-3": 14, "4-5": 19 },
      "70-80": { "0-1": 16, "2-3": 19, "4-5": 23 },
    },
    atypical: {
      "30-39": { "0-1": 0, "2-3": 1, "4-5": 3 },
      "40-49": { "0-1": 1, "2-3": 2, "4-5": 5 },
      "50-59": { "0-1": 2, "2-3": 3, "4-5": 7 },
      "60-69": { "0-1": 3, "2-3": 6, "4-5": 11 },
      "70-80": { "0-1": 6, "2-3": 10, "4-5": 16 },
    },
    other: {
      "30-39": { "0-1": 0, "2-3": 1, "4-5": 2 },
      "40-49": { "0-1": 1, "2-3": 1, "4-5": 3 },
      "50-59": { "0-1": 1, "2-3": 2, "4-5": 5 },
      "60-69": { "0-1": 2, "2-3": 4, "4-5": 7 },
      "70-80": { "0-1": 2, "2-3": 7, "4-5": 11 },
    },
  },
};

export function countCadRiskFactors(factors: Record<CadFactorKey, boolean>) {
  return Object.values(factors).filter(Boolean).length;
}

export function getCadFactorBucket(factorCount: number): "0-1" | "2-3" | "4-5" {
  if (factorCount >= 4) return "4-5";
  if (factorCount >= 2) return "2-3";
  return "0-1";
}

export function assessCadRisk(state: CadState): CadAssessment {
  const factorCount = countCadRiskFactors(state.factors);
  const factorBucket = getCadFactorBucket(factorCount);
  const probability = CAD_MATRIX[state.sex][state.symptoms][state.ageRange][factorBucket];

  return {
    probability,
    factorCount,
    factorBucket,
    riskLevel: probability <= 15 ? "low" : "elevated",
  };
}
