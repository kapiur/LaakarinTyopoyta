"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "../lib/useI18n";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const labels = {
  fi: "Asenna sovellus",
  ru: "Установить приложение",
  en: "Install app",
  de: "App installieren",
} as const;

export default function InstallPwaButton() {
  const { language } = useI18n();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    return () => window.removeEventListener("beforeinstallprompt", capturePrompt);
  }, []);

  if (!installPrompt) return <div className="h-11 w-11" aria-hidden="true" />;

  const label = labels[language as keyof typeof labels] ?? labels.fi;
  return (
    <button
      type="button"
      onClick={async () => {
        await installPrompt.prompt();
        await installPrompt.userChoice;
        setInstallPrompt(null);
      }}
      title={label}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-xl text-blue-600 hover:bg-blue-50"
    >
      <Download size={20} />
    </button>
  );
}
