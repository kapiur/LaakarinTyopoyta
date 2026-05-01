"use client";

import { useSession } from "next-auth/react";
import { translate, type TranslationKey } from "./i18n";
import { normalizeUiLanguage } from "./i18n/config";

export function useI18n() {
  const { data: session } = useSession();
  const language = normalizeUiLanguage((session?.user as any)?.uiLanguage);

  return {
    language,
    t: (key: TranslationKey) => translate(language, key),
  };
}
