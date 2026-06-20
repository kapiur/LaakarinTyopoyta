"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Briefcase, Copy, MessageSquareShare, RefreshCcw, Trash2, X } from "lucide-react";
import { useI18n } from "../../lib/useI18n";
import { useCaseSession } from "./CaseSessionProvider";
import { queueCaseSessionTransfer } from "../../lib/workspace/caseSessionTransfer";

const copyByLanguage = {
  fi: {
    title: "Tapaussessio",
    subtitle: "Vain tämän selainistunnon ajan. Ei tallennu palvelimelle.",
    purpose: "Kerää tähän väliaikaisesti tapauksen teksti, laskelmat ja artikkelipoiminnat ja siirrä ne sitten AI-työkaluun tai keskusteluun.",
    empty: "Lisää tähän väliaikaisesti kliininen luonnos, laskelma, artikkelitulkinta tai keskusteluvastaus.",
    open: "Avaa tapaussessio",
    close: "Sulje tapaussessio",
    clear: "Tyhjennä sessio",
    copy: "Kopioi sessio",
    sendToTool: "Avaa AI-tyokalussa",
    sendToAssistant: "Keskustele AI:n kanssa",
  },
  ru: {
    title: "Сессия случая",
    subtitle: "Только для текущей браузерной сессии. На сервер не сохраняется.",
    purpose: "Соберите здесь временный контекст случая: текст, расчеты и выдержки из статей, а затем перенесите все в AI-инструмент или обсуждение с ассистентом.",
    empty: "Сюда можно временно складывать клинический черновик, расчет, разбор статьи или ответ ассистента.",
    open: "Открыть сессию случая",
    close: "Закрыть сессию случая",
    clear: "Очистить сессию",
    copy: "Скопировать сессию",
    sendToTool: "Открыть в AI-инструменте",
    sendToAssistant: "Обсудить с AI",
  },
  en: {
    title: "Case session",
    subtitle: "This browser session only. Nothing is stored on the server.",
    purpose: "Use this as a temporary case buffer: gather text, calculations, and article excerpts, then send the whole set into the AI tool or assistant discussion.",
    empty: "Temporarily collect a clinical draft, calculation, article interpretation, or assistant reply here.",
    open: "Open case session",
    close: "Close case session",
    clear: "Clear session",
    copy: "Copy session",
    sendToTool: "Open in AI tool",
    sendToAssistant: "Discuss with AI",
  },
  de: {
    title: "Fallsitzung",
    subtitle: "Nur fuer diese Browser-Sitzung. Nichts wird auf dem Server gespeichert.",
    purpose: "Hier koennen Sie voruebergehend Falltext, Berechnungen und Artikelnotizen sammeln und danach gesammelt an das AI-Werkzeug oder die Assistenten-Diskussion uebergeben.",
    empty: "Hier koennen voruebergehend klinische Entwuerfe, Berechnungen, Artikelinterpretationen oder Assistentenantworten gesammelt werden.",
    open: "Fallsitzung oeffnen",
    close: "Fallsitzung schliessen",
    clear: "Sitzung leeren",
    copy: "Sitzung kopieren",
    sendToTool: "Im AI-Werkzeug oeffnen",
    sendToAssistant: "Mit AI besprechen",
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
  const router = useRouter();
  const pathname = usePathname();
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

  function sendSession(target: "text_tool" | "assistant") {
    if (!sessionText) return;
    queueCaseSessionTransfer({ target, content: sessionText });
    setOpen(false);
    if (pathname !== "/") {
      router.push("/");
    }
  }

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
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Briefcase size={18} className="text-blue-600" />
                  {copy.title}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{copy.subtitle}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy.purpose}</p>
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

            <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
              <button
                type="button"
                onClick={() => sendSession("text_tool")}
                disabled={!sessionText}
                className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
              >
                <ArrowUpRight size={14} />
                {copy.sendToTool}
              </button>
              <button
                type="button"
                onClick={() => sendSession("assistant")}
                disabled={!sessionText}
                className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
              >
                <MessageSquareShare size={14} />
                {copy.sendToAssistant}
              </button>
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
