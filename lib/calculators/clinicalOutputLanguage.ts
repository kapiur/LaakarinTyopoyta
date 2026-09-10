export const CALCULATOR_OUTPUT_LANGUAGES = ["fi", "sv", "ru", "de", "en"] as const;

export type CalculatorOutputLanguage = (typeof CALCULATOR_OUTPUT_LANGUAGES)[number];

export function normalizeCalculatorOutputLanguage(value: unknown): CalculatorOutputLanguage {
  return CALCULATOR_OUTPUT_LANGUAGES.includes(value as CalculatorOutputLanguage)
    ? (value as CalculatorOutputLanguage)
    : "en";
}

export function formatCalculatorNumber(
  value: number,
  digits: number,
  language: CalculatorOutputLanguage,
) {
  if (!Number.isFinite(value)) return "0";
  const decimalSeparator = language === "en" ? "." : ",";
  return value.toFixed(digits).replace(".", decimalSeparator);
}
