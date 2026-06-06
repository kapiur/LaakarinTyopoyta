export type ChadsState = {
  chf: boolean;
  hypertension: boolean;
  age75Plus: boolean;
  age65to74: boolean;
  diabetes: boolean;
  strokeOrTia: boolean;
  vascularDisease: boolean;
  femaleSex: boolean;
};

export type HasBledState = {
  systolicBpOver160: boolean;
  renal: boolean;
  liver: boolean;
  stroke: boolean;
  priorBleeding: boolean;
  labileInr: boolean;
  ageOver65: boolean;
  drugs: boolean;
  alcohol: boolean;
};

export type ChadsAssessment = {
  score: number;
  annualStrokeRiskPercent: number;
};

export type HasBledAssessment = {
  score: number;
  riskLevel: "low" | "moderate" | "high";
};

const STROKE_RISK_BY_SCORE = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 12.5, 15.2];

export function calculateChadsVascScore(state: ChadsState) {
  let score = 0;
  if (state.chf) score += 1;
  if (state.hypertension) score += 1;
  if (state.age75Plus) score += 2;
  else if (state.age65to74) score += 1;
  if (state.diabetes) score += 1;
  if (state.strokeOrTia) score += 2;
  if (state.vascularDisease) score += 1;
  if (state.femaleSex && score > 0) score += 1;
  return score;
}

export function assessChadsVascRisk(score: number): ChadsAssessment {
  const annualStrokeRiskPercent = STROKE_RISK_BY_SCORE[score] ?? STROKE_RISK_BY_SCORE[STROKE_RISK_BY_SCORE.length - 1];
  return { score, annualStrokeRiskPercent };
}

export function calculateHasBledScore(state: HasBledState) {
  let score = 0;
  if (state.systolicBpOver160) score += 1;
  if (state.renal) score += 1;
  if (state.liver) score += 1;
  if (state.stroke) score += 1;
  if (state.priorBleeding) score += 1;
  if (state.labileInr) score += 1;
  if (state.ageOver65) score += 1;
  if (state.drugs) score += 1;
  if (state.alcohol) score += 1;
  return score;
}

export function assessHasBledRisk(score: number): HasBledAssessment {
  if (score >= 3) {
    return { score, riskLevel: "high" };
  }

  if (score >= 2) {
    return { score, riskLevel: "moderate" };
  }

  return { score, riskLevel: "low" };
}
