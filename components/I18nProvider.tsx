"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_UI_LANGUAGE, normalizeUiLanguage, type UiLanguage } from "../lib/i18n/config";
import { translate, type TranslationKey } from "../lib/i18n";

const STORAGE_KEY = "uiLanguage";

type I18nContextValue = {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue>({
  language: DEFAULT_UI_LANGUAGE,
  setLanguage: () => undefined,
  t: (key) => translate(DEFAULT_UI_LANGUAGE, key),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>(DEFAULT_UI_LANGUAGE);

  useEffect(() => {
    const storedLanguage = normalizeUiLanguage(window.localStorage.getItem(STORAGE_KEY));
    setLanguageState(storedLanguage);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadLanguage() {
      try {
        const response = await fetch("/api/profile/settings", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const normalized = normalizeUiLanguage(data?.uiLanguage);
        if (isMounted) {
          setLanguageState(normalized);
          window.localStorage.setItem(STORAGE_KEY, normalized);
        }
      } catch (error) {
        console.error("UI language loading failed", error);
      }
    }

    loadLanguage();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage: (nextLanguage) => {
      const normalized = normalizeUiLanguage(nextLanguage);
      setLanguageState(normalized);
      window.localStorage.setItem(STORAGE_KEY, normalized);
    },
    t: (key) => translate(language, key),
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18nContext() {
  return useContext(I18nContext);
}
