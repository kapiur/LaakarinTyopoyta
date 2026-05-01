export const SUPPORTED_UI_LANGUAGES = [
  { code: "fi", nativeName: "Suomi" },
  { code: "ru", nativeName: "Русский" },
  { code: "en", nativeName: "English" },
] as const;

export type UiLanguage = (typeof SUPPORTED_UI_LANGUAGES)[number]["code"];

export const DEFAULT_UI_LANGUAGE: UiLanguage = "fi";

export function isSupportedUiLanguage(value: unknown): value is UiLanguage {
  return typeof value === "string" && SUPPORTED_UI_LANGUAGES.some((language) => language.code === value);
}

export function normalizeUiLanguage(value: unknown): UiLanguage {
  return isSupportedUiLanguage(value) ? value : DEFAULT_UI_LANGUAGE;
}
