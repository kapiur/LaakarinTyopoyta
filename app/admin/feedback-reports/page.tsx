"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquareWarning, RefreshCcw } from "lucide-react";

type FeedbackReport = {
  id: string;
  surface: string;
  contextType: string | null;
  feedbackType: string;
  title: string | null;
  comment: string;
  pagePath: string | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  clinicalCountry: string | null;
  uiLanguage: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  user: {
    email: string;
    name: string | null;
  };
};

const STATUS_OPTIONS = ["all", "new", "reviewing", "resolved", "dismissed"] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fi-FI", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminFeedbackReportsPage() {
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("new");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadReports(nextStatus = statusFilter) {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/feedback-reports?status=${encodeURIComponent(nextStatus)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "load_failed");
      setReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (error) {
      console.error("Feedback reports loading failed", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports(statusFilter);
  }, [statusFilter]);

  async function updateStatus(id: string, status: string) {
    setSavingId(id);
    try {
      const response = await fetch(`/api/admin/feedback-reports/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("save_failed");
      await loadReports(statusFilter);
    } catch (error) {
      console.error("Feedback report status update failed", error);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <MessageSquareWarning size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Palaute ja epätarkkuudet</h1>
            <p className="text-sm text-slate-500">Käyttäjien ilmoitukset virheistä, vanhentuneesta sisällöstä ja huonoista käännöksistä.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadReports(statusFilter)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCcw size={16} />
          Päivitä
        </button>
      </header>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatusFilter(option)}
              className={`rounded-full border px-4 py-2 text-xs font-bold ${
                statusFilter === option
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-sm text-slate-500 flex items-center justify-center gap-3 shadow-sm">
            <Loader2 size={18} className="animate-spin" />
            Ladataan palautteita...
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-sm text-slate-500 shadow-sm">
            Ei palautteita tällä suodatuksella.
          </div>
        ) : (
          reports.map((report) => (
            <article key={report.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      {report.feedbackType}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {report.surface}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(report.createdAt)}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{report.title || "Без заголовка"}</h2>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{report.comment}</p>
                  <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    <div>Пользователь: {report.user.name || report.user.email}</div>
                    <div>Email: {report.user.email}</div>
                    <div>Контекст: {report.contextType || "-"}</div>
                    <div>Страна: {report.clinicalCountry || "-"}</div>
                    <div>Язык: {report.uiLanguage || "-"}</div>
                    <div>Страница: {report.pagePath || "-"}</div>
                    <div className="sm:col-span-2">Источник: {report.sourceLabel || "-"}</div>
                    {report.sourceUrl && (
                      <a href={report.sourceUrl} target="_blank" rel="noreferrer" className="sm:col-span-2 text-blue-600 hover:underline break-all">
                        {report.sourceUrl}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <select
                    value={report.status}
                    onChange={(event) => void updateStatus(report.id, event.target.value)}
                    disabled={savingId === report.id}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    {STATUS_OPTIONS.filter((item) => item !== "all").map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {savingId === report.id && <Loader2 size={16} className="animate-spin text-slate-400" />}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
