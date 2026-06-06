export function calculateBmi(heightCm: number, weightKg: number) {
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || heightCm <= 0 || weightKg <= 0) {
    return null;
  }

  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function classifyBmi(bmi: number) {
  if (!Number.isFinite(bmi) || bmi <= 0) return null;

  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  if (bmi < 35) return "obesity1";
  if (bmi < 40) return "obesity2";
  return "obesity3";
}
