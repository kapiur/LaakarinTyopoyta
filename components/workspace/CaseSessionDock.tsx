"use client";

import { useMemo, useState } from "react";
import { Briefcase, Copy, RefreshCcw, Trash2, X } from "lucide-react";
import { useI18n } from "../../lib/useI18n";
import { useCaseSession } from "./CaseSessionProvider";

const copyByLanguage = {
  fi: {
    title: "Tapaussessio",
    subtitle: "Vain tämän selainistunnon ajan. Ei tallennu palvelimelle.",
    empty: "Lisää tähän väliaikaisesti kliininen luonnos, laskelma, artikkelitulkinta tai keskusteluvastaus.",
    open: "Avaa tapaussessio",
    close: "Sulje tapaussessio",
    clear: "Tyhjennä sessio",
    copy: "Kopioi sessio",
  },
  ru: {
    title: "Сессия случая",
    subtitle: "Только для текущей браузерной сессии. На сервер не сохраняется.",
    empty: "Сюда можно временно складывать клинический черновик, расчет, разбор статьи или ответ ассистента.",
    open: "Открыть сессию случая",
    close: "Закрыть сессию случая",
    clear: "Очистить сессию",
    copy: "Скопировать сессию",
  },
  en: {
    title: "Case session",
    subtitle: "This browser session only. Nothing is stored on the server.",
    empty: "Temporarily collect a clinical draft, calculation, article interpretation, or assistant reply here.",
    open: "Open case session",
    close: "Close case session",
    clear: "Clear session",
    copy: "Copy session",
  },
  de: {
    title: "Fallsitzung",
    subtitle: "Nur fuer diese Browser-Sitzung. Nichts wird auf dem Server gespeichert.",
    empty: "Hier koennen voruebergehend klinische Entwuerfe, Berechnungen, Artikelinterpretationen oder Assistentenantworten gesammelt werden.",
    open: "Fallsitzung oeffnen",
    close: "Fallsitzung schliessen",
    clear: "Sitzung leeren",
    copy: "Sitzung kopieren",
  },
} as const;

const labelsByType = {
  clinical_note: { fi: "Kliininen teksti", ru: "Клинический текст", en: "Clinical note", de: "Klinischer Text" },
  calculation: { fi: "Laskelma", ru: "Расчет", en: "Calculation", de: "Berechnung" },
  article: { fi: "Artikkeli", ru: "Статья", en: "Article", de: "Artikel" },
  guideline_check: { fi: "Suositusvertailu", ru: "Сверка с рекомендациями", en: "Guideline check", de: "Leitlinienabgleich" },
  discussion: { fi: "Keskustelu", ru: "Обсуждение", en: "Discussion", de: "Diskussion" },
  result: { fi: "Tulos", ru: "Результат", en: "Result", de: "Ergebnis" },
} as const;

export default function CaseSessionDock() {
  const { language } = useI18n();
  const { items, clearSession, removeItem } = useCaseSession();
  const [open, setOpen] = useState(false);
  const copy = copyByLanguage[language as keyof typeof copyByLanguage] ?? copyByLanguage.en;

  const sessionText = useMemo(
    () =>
      items
        .slice()
        .reverse()
        .map((item) => {
          const typeLabel = labelsByType[item.type]?.[language as keyof typeof labelsByType.result] ?? item.type;
          return [
            `[${typeLabel}] ${item.title}`,
            item.sourceLabel ? `Source: ${item.sourceLabel}` : "",
            item.content,
          ].filter(Boolean).join("\n");
        })
        .join("\n\n---\n\n"),
    [items, language],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={copy.open}
        aria-label={copy.open}
        className="fixed bottom-4 right-4 z-[85] flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-lg hover:bg-slate-50"
      >
        <Briefcase size={18} className="text-blue-600" />
        <span>{copy.title}</span>
        {items.length > 0 && (
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] text-white">{items.length}</span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[95] flex items-end justify-end bg-slate-950/35 p-3 backdrop-blur-[2px]" onMouseDown={() => setOpen(false)}>
          <div
            className="flex h-[min(82vh,48rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Briefcase size={18} className="text-blue-600" />
                  {copy.title}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{copy.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title={copy.close}
                aria-label={copy.close}
                className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex items-center justify-end gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(sessionText)}
                disabled={!sessionText}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <Copy size={14} />
                {copy.copy}
              </button>
              <button
                type="button"
                onClick={clearSession}
                disabled={items.length === 0}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <RefreshCcw size={14} />
                {copy.clear}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-500">
                  {copy.empty}
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => {
                    const typeLabel = labelsByType[item.type]?.[language as keyof typeof labelsByType.result] ?? item.type;
                    return (
                      <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">{typeLabel}</div>
                            <h3 className="mt-1 text-sm font-bold text-slate-900">{item.title}</h3>
                            {item.sourceLabel && <div className="mt-1 text-xs text-slate-500">{item.sourceLabel}</div>}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="rounded-md p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                          {item.content}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
