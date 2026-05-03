"use client";

import { ReactNode } from "react";
import { BookOpen, NotebookTabs, Sparkles } from "lucide-react";
import { useI18n } from "../../lib/useI18n";

type UiLang = "fi" | "ru" | "en";

const ui = {
  fi: {
    main: "Pikaohjeet",
    notes: "Omat muistilaput",
    builder: "Clinical Builder",
  },
  ru: {
    main: "Pikaohjeet",
    notes: "Мои заметки",
    builder: "Clinical Builder",
  },
  en: {
    main: "Pikaohjeet",
    notes: "My notes",
    builder: "Clinical Builder",
  },
};

export default function PikaohjeetV2Layout({ children }: { children: ReactNode }) {
  const { language } = useI18n();
  const dict = ui[(language as UiLang) || "fi"] ?? ui.fi;

  return (
    <div className="relative min-h-screen">
      {children}
      <nav className="fixed bottom-5 right-5 z-40 flex max-w-[calc(100vw-2.5rem)] flex-wrap gap-2 rounded-[1.5rem] border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-slate-200/60 backdrop-blur">
        <a
          href="/pikaohjeet-v2"
          className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-600 transition hover:bg-slate-100"
        >
          <BookOpen size={15} /> {dict.main}
        </a>
        <a
          href="/pikaohjeet-v2/muistilaput"
          className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-600 transition hover:bg-slate-100"
        >
          <NotebookTabs size={15} /> {dict.notes}
        </a>
        <a
          href="/pikaohjeet-v2/clinical-builder"
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
        >
          <Sparkles size={15} /> {dict.builder}
        </a>
      </nav>
    </div>
  );
}
