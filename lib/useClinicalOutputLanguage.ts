"use client";

import { useEffect, useState } from "react";
import {
  normalizeCalculatorOutputLanguage,
  type CalculatorOutputLanguage,
} from "./calculators/clinicalOutputLanguage";

export function useClinicalOutputLanguage() {
  const [language, setLanguage] = useState<CalculatorOutputLanguage | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/profile/workspace-context", { cache: "no-store" });
        const data = await response.json();
        if (active && response.ok) {
          setLanguage(normalizeCalculatorOutputLanguage(data?.settings?.clinicalOutputLanguage));
        }
      } catch {
        // Keep the documentation action disabled until the profile setting is available.
      }
    }

    load();
    window.addEventListener("workspace-context-updated", load);
    window.addEventListener("workspace-context-invalidated", load);

    return () => {
      active = false;
      window.removeEventListener("workspace-context-updated", load);
      window.removeEventListener("workspace-context-invalidated", load);
    };
  }, []);

  return {
    clinicalOutputLanguage: language,
    clinicalOutputLanguageReady: language !== null,
  };
}
