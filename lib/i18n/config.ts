export const SUPPORTED_UI_LANGUAGES = [
  { code: "fi", nativeName: "Suomi" },
  { code: "ru", nativeName: "Русский" },
  { code: "en", nativeName: "English" },
  { code: "de", nativeName: "Deutsch" },
] as const;

export type UiLanguage = (typeof SUPPORTED_UI_LANGUAGES)[number]["code"];
export type LocalizedText = Partial<Record<UiLanguage, string>>;

export const DEFAULT_UI_LANGUAGE: UiLanguage = "fi";

export function isSupportedUiLanguage(value: unknown): value is UiLanguage {
  return typeof value === "string" && SUPPORTED_UI_LANGUAGES.some((language) => language.code === value);
}

export function normalizeUiLanguage(value: unknown): UiLanguage {
  return isSupportedUiLanguage(value) ? value : DEFAULT_UI_LANGUAGE;
}

export function getLocalizedText(
  values: LocalizedText | undefined,
  language: unknown,
  fallbackLanguage: UiLanguage = "en"
): string {
  if (!values) return "";

  const normalizedLanguage = normalizeUiLanguage(language);
  return (
    values[normalizedLanguage] ??
    values[fallbackLanguage] ??
    values[DEFAULT_UI_LANGUAGE] ??
    Object.values(values).find((value): value is string => typeof value === "string" && value.length > 0) ??
    ""
  );
}

export function getLocalizedVariant<T extends Partial<Record<UiLanguage, unknown>>>(
  values: T | undefined,
  language: unknown,
  fallbackLanguage: UiLanguage = "en"
): Exclude<T[keyof T], undefined> | undefined {
  if (!values) return undefined;

  const normalizedLanguage = normalizeUiLanguage(language);
  const resolved = (
    values[normalizedLanguage] ??
    values[fallbackLanguage] ??
    values[DEFAULT_UI_LANGUAGE] ??
    Object.values(values).find((value): value is Exclude<T[keyof T], undefined> => value !== undefined)
  ) as Exclude<T[keyof T], undefined> | undefined;

  return resolved;
}
