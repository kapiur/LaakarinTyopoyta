export type CockcroftGaultSex = "male" | "female";

const SEX_FACTOR: Record<CockcroftGaultSex, number> = {
  male: 1.23,
  female: 1.04,
};

export function calculateCockcroftGault(ageYears: number, weightKg: number, creatinineUmolL: number, sex: CockcroftGaultSex) {
  if (
    !Number.isFinite(ageYears) ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(creatinineUmolL) ||
    ageYears <= 0 ||
    weightKg <= 0 ||
    creatinineUmolL <= 0
  ) {
    return null;
  }

  const factor = SEX_FACTOR[sex];
  return ((140 - ageYears) * weightKg * factor) / creatinineUmolL;
}

export function classifyGfr(gfr: number) {
  if (!Number.isFinite(gfr) || gfr <= 0) return null;

  if (gfr >= 90) return "normal";
  if (gfr >= 60) return "mild";
  if (gfr >= 45) return "mildModerate";
  if (gfr >= 30) return "moderateSevere";
  if (gfr >= 15) return "severe";
  return "kidneyFailure";
}
