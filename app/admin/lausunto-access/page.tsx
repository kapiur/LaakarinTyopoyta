"use client";

import { useEffect, useState } from "react";
import { FileBadge2, Loader2, RefreshCcw } from "lucide-react";
import { useI18n } from "../../../lib/useI18n";

type LausuntoAccessUser = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  practiceCountry: string;
  lausuntoToolEnabled: boolean;
};

export default function AdminLausuntoAccessPage() {
  const { language } = useI18n();
  const [users, setUsers] = useState<LausuntoAccessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = {
    title:
      language === "ru" ? "Доступ к lausunto-инструменту" : language === "en" ? "Lausunto tool access" : language === "de" ? "Zugriff auf das Lausunto-Werkzeug" : "Lausunto-tyokalun kayttooikeus",
    description:
      language === "ru"
        ? "Включайте инструмент только тем врачам, которые работают по финскому контуру."
        : language === "en"
          ? "Enable the tool only for clinicians working in the Finnish workflow."
          : language === "de"
            ? "Das Werkzeug nur fuer Kliniker im finnischen Arbeitskontext freischalten."
            : "Ota tyokalu kayttoon vain niille laakareille, jotka toimivat Suomen tyokulussa.",
    refresh: language === "ru" ? "Обновить" : language === "en" ? "Refresh" : language === "de" ? "Aktualisieren" : "Paivita",
    enabled: language === "ru" ? "Инструмент включён" : language === "en" ? "Tool enabled" : language === "de" ? "Werkzeug aktiviert" : "Tyokalu kaytossa",
    fiOnly:
      language === "ru"
        ? "Работает только при стране работы FI."
        : language === "en"
          ? "Works only when practice country is FI."
          : language === "de"
            ? "Funktioniert nur bei Arbeitsland FI."
            : "Toimii vain, jos tyoskentelymaa on FI.",
    loading: language === "ru" ? "Загрузка..." : language === "en" ? "Loading..." : language === "de" ? "Laedt..." : "Ladataan...",
  };

  async function fetchUsers() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/lausunto-access", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load");
      setUsers(data.users || []);
    } catch (loadError: any) {
      setError(loadError.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function updateUser(userId: number, lausuntoToolEnabled: boolean) {
    setSavingId(userId);
    setError(null);

    try {
      const response = await fetch("/api/admin/lausunto-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, lausuntoToolEnabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save");
      await fetchUsers();
    } catch (saveError: any) {
      setError(saveError.message || "Failed to save");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
            <FileBadge2 size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{copy.title}</h1>
            <p className="text-sm text-slate-500">{copy.description}</p>
          </div>
        </div>

        <button onClick={fetchUsers} disabled={loading} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          {copy.refresh}
        </button>
      </header>

      {error ? (
        <div className="rounded-2xl px-5 py-4 text-sm font-semibold bg-red-50 text-red-700 border border-red-100">
          {error}
        </div>
      ) : null}

      <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            {copy.loading}
          </div>
        ) : (
          users.map((user) => {
            const fiEligible = user.practiceCountry === "FI";
            return (
              <div key={user.id} className="border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-slate-900">{user.name || user.email}</h2>
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-bold">{user.role}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${fiEligible ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                      {user.practiceCountry}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{user.email}</p>
                  {!fiEligible ? <p className="text-xs text-amber-700 mt-2">{copy.fiOnly}</p> : null}
                </div>

                <label className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${fiEligible ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                  <input
                    type="checkbox"
                    checked={user.lausuntoToolEnabled}
                    disabled={!fiEligible || savingId === user.id}
                    onChange={(event) => updateUser(user.id, event.target.checked)}
                  />
                  <span className="text-sm font-bold">{savingId === user.id ? copy.loading : copy.enabled}</span>
                </label>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
