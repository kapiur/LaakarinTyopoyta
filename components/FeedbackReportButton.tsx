"use client";

import { AlertCircle, Loader2, MessageSquareWarning, Send, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../lib/useI18n";

type FeedbackType = "error" | "outdated" | "unclear" | "translation" | "other";

const copy = {
  fi: {
    open: "Ilmoita virhe tai epätarkkuus",
    title: "Ilmoita virhe tai epätarkkuus",
    comment: "Kuvaus",
    submit: "Lähetä palaute",
    sending: "Lähetetään...",
    success: "Palaute lähetetty.",
    types: {
      error: "Virhe",
      outdated: "Vanhentunut",
      unclear: "Epäselvä",
      translation: "Huono käännös",
      other: "Muu",
    },
  },
  ru: {
    open: "Сообщить об ошибке или неточности",
    title: "Сообщить об ошибке или неточности",
    comment: "Комментарий",
    submit: "Отправить",
    sending: "Отправка...",
    success: "Сообщение отправлено.",
    types: {
      error: "Ошибка",
      outdated: "Устарело",
      unclear: "Неясно",
      translation: "Плохой перевод",
      other: "Другое",
    },
  },
  en: {
    open: "Report an error or inaccuracy",
    title: "Report an error or inaccuracy",
    comment: "Comment",
    submit: "Send feedback",
    sending: "Sending...",
    success: "Feedback sent.",
    types: {
      error: "Error",
      outdated: "Outdated",
      unclear: "Unclear",
      translation: "Poor translation",
      other: "Other",
    },
  },
  de: {
    open: "Fehler oder Unklarheit melden",
    title: "Fehler oder Unklarheit melden",
    comment: "Kommentar",
    submit: "Senden",
    sending: "Wird gesendet...",
    success: "Rueckmeldung gesendet.",
    types: {
      error: "Fehler",
      outdated: "Veraltet",
      unclear: "Unklar",
      translation: "Schlechte Uebersetzung",
      other: "Sonstiges",
    },
  },
} as const;

export default function FeedbackReportButton({
  surface,
  contextType,
  title,
  sourceLabel,
  sourceUrl,
  clinicalCountry,
  metadata,
  variant = "inline",
}: {
  surface: string;
  contextType?: string;
  title?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  clinicalCountry?: string;
  metadata?: Record<string, unknown>;
  variant?: "inline" | "ghost";
}) {
  const { language } = useI18n();
  const l = copy[language as keyof typeof copy] ?? copy.en;
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("error");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!comment.trim() || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/feedback/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surface,
          contextType,
          title,
          sourceLabel,
          sourceUrl,
          clinicalCountry,
          uiLanguage: language,
          feedbackType,
          comment,
          pagePath: typeof window !== "undefined" ? window.location.pathname : "",
          metadata,
        }),
      });
      if (!response.ok) throw new Error("feedback_failed");
      setSent(true);
      setComment("");
      setTimeout(() => {
        setOpen(false);
        setSent(false);
      }, 900);
    } catch (error) {
      console.error("Feedback submit failed", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "ghost"
            ? "inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            : "inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        }
      >
        <AlertCircle size={14} />
        {l.open}
      </button>

      {open && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                <MessageSquareWarning size={18} className="text-amber-600" />
                {l.title}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </header>

            <div className="space-y-4 px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(l.types) as FeedbackType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFeedbackType(type)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                      feedbackType === type
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {l.types[type]}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{l.comment}</label>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="mt-2 h-32 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
              <div className="text-xs font-semibold text-emerald-600">{sent ? l.success : ""}</div>
              <button
                type="button"
                onClick={submit}
                disabled={!comment.trim() || saving}
                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {saving ? l.sending : l.submit}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
