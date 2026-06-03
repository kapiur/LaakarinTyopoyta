"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Loader2, RefreshCcw, Save } from "lucide-react";
import { useI18n } from "../../../lib/useI18n";
import { aiAdminT } from "../../../components/ai-admin/aiAdminI18n";

type AiAccessUser = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  policy: {
    allowPlatformCredentials: boolean;
    allowUserCredentials: boolean;
    requireUserCredentials: boolean;
    allowedProviders: string[];
    monthlyTokenLimit: number | null;
    monthlyCostLimitCents: number | null;
  };
};

type Registry = Record<string, { label: string }>;

type EditState = AiAccessUser["policy"] & { userId: number };

export default function AdminAiAccessPage() {
  const { language } = useI18n();
  const tt = (key: string) => aiAdminT(language, "access", key);
  const tc = (key: string) => aiAdminT(language, "common", key);

  const [users, setUsers] = useState<AiAccessUser[]>([]);
  const [registry, setRegistry] = useState<Registry>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const providerOptions = useMemo(() => Object.entries(registry), [registry]);

  async function fetchAccess() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/ai-access");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || tt("loadFailed"));

      setUsers(data.users || []);
      setRegistry(data.registry || {});
    } catch (err: any) {
      setError(err.message || tt("loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  function startEdit(user: AiAccessUser) {
    setEditing({ userId: user.id, ...user.policy });
    setMessage(null);
    setError(null);
  }

  function toggleProvider(provider: string) {
    if (!editing) return;
    const exists = editing.allowedProviders.includes(provider);
    setEditing({
      ...editing,
      allowedProviders: exists ? editing.allowedProviders.filter((item) => item !== provider) : [...editing.allowedProviders, provider],
    });
  }

  async function savePolicy() {
    if (!editing) return;
    setSavingId(editing.userId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/ai-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || tt("saveFailed"));

      setMessage(tt("saved"));
      setEditing(null);
      await fetchAccess();
    } catch (err: any) {
      setError(err.message || tt("saveFailed"));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
            <BrainCircuit size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{tt("title")}</h1>
            <p className="text-sm text-slate-500">{tt("description")}</p>
          </div>
        </div>

        <button onClick={fetchAccess} disabled={loading} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          {tc("refresh")}
        </button>
      </header>

      {(message || error) && (
        <div className={`rounded-2xl px-5 py-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
          {error || message}
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> {tc("loading")}</div>
        ) : (
          users.map((user) => {
            const isEditing = editing?.userId === user.id;
            const current = isEditing ? editing : { userId: user.id, ...user.policy };

            return (
              <div key={user.id} className="border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">{user.name || user.email}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-bold">{user.role}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{user.isActive ? tc("active") : tc("inactive")}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{user.email}</p>
                  </div>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button onClick={savePolicy} disabled={savingId === user.id} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50">
                          {savingId === user.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          {tc("save")}
                        </button>
                        <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">{tc("cancel")}</button>
                      </>
                    ) : (
                      <button onClick={() => startEdit(user)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">{tc("edit")}</button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-600">
                    <input type="checkbox" disabled={!isEditing} checked={current.allowPlatformCredentials} onChange={(event) => editing && setEditing({ ...editing, allowPlatformCredentials: event.target.checked })} />
                    {tt("platformKeys")}
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-600">
                    <input type="checkbox" disabled={!isEditing} checked={current.allowUserCredentials} onChange={(event) => editing && setEditing({ ...editing, allowUserCredentials: event.target.checked, requireUserCredentials: event.target.checked ? editing.requireUserCredentials : false })} />
                    {tt("userKeysAllowed")}
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-600">
                    <input type="checkbox" disabled={!isEditing} checked={current.requireUserCredentials} onChange={(event) => editing && setEditing({ ...editing, requireUserCredentials: event.target.checked, allowUserCredentials: event.target.checked ? true : editing.allowUserCredentials })} />
                    {tt("requireUserKey")}
                  </label>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tt("allowedProviders")}</p>
                  <div className="flex flex-wrap gap-2">
                    <button disabled={!isEditing} onClick={() => editing && setEditing({ ...editing, allowedProviders: [] })} className={`px-3 py-2 rounded-xl text-xs font-bold border ${current.allowedProviders.length === 0 ? "bg-blue-50 border-blue-100 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>{tc("all")}</button>
                    {providerOptions.map(([key, value]) => (
                      <button key={key} disabled={!isEditing} onClick={() => toggleProvider(key)} className={`px-3 py-2 rounded-xl text-xs font-bold border ${current.allowedProviders.includes(key) ? "bg-blue-50 border-blue-100 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>{value.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
