import { DEFAULT_UI_LANGUAGE, normalizeUiLanguage, type UiLanguage } from "./config";
import { dictionaries, type TranslationKey } from "./dictionaries";

function getNestedValue(dictionary: any, key: TranslationKey): string | undefined {
  return key.split(".").reduce((acc, part) => acc?.[part], dictionary);
}

export function translate(language: unknown, key: TranslationKey): string {
  const normalizedLanguage = normalizeUiLanguage(language);
  return (
    getNestedValue(dictionaries[normalizedLanguage], key) ??
    getNestedValue(dictionaries[DEFAULT_UI_LANGUAGE], key) ??
    key
  );
}

export type { TranslationKey, UiLanguage };
export { DEFAULT_UI_LANGUAGE, SUPPORTED_UI_LANGUAGES, isSupportedUiLanguage, normalizeUiLanguage } from "./config";
