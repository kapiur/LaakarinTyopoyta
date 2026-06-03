"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, RefreshCcw, Save, Trash2, XCircle } from "lucide-react";

type ProviderCredential = {
  id: string;
  provider: string;
  label: string | null;
  keyPreview: string | null;
  baseUrl: string | null;
  isEnabled: boolean;
  isDefault: boolean;
  defaultModel: string | null;
  allowedModels: string[];
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
  lastTestError: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Registry = Record<string, { label: string; models: Array<{ id: string; label: string }> }>;

type FormState = {
  provider: string;
  label: string;
  secret: string;
  baseUrl: string;
  isEnabled: boolean;
  isDefault: boolean;
  defaultModel: string;
  allowedModels: string;
};

const initialForm: FormState = {
  provider: "openai",
  label: "OpenAI",
  secret: "",
  baseUrl: "",
  isEnabled: true,
  isDefault: true,
  defaultModel: "gpt-5.4",
  allowedModels: "gpt-5.4",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fi-FI", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function modelsToText(value: string[]) {
  return value.join(", ");
}

function textToModels(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminAiProvidersPage() {
  const [providers, setProviders] = useState<ProviderCredential[]>([]);
  const [registry, setRegistry] = useState<Registry>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const providerOptions = useMemo(() => Object.entries(registry), [registry]);

  async function fetchProviders() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/ai-providers");
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "AI-palveluiden lataus epäonnistui");

      setProviders(data.providers || []);
      setRegistry(data.registry || {});
    } catch (err: any) {
      setError(err.message || "AI-palveluiden lataus epäonnistui");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProviders();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  function editProvider(provider: ProviderCredential) {
    setEditingId(provider.id);
    setForm({
      provider: provider.provider,
      label: provider.label || "",
      secret: "",
      baseUrl: provider.baseUrl || "",
      isEnabled: provider.isEnabled,
      isDefault: provider.isDefault,
      defaultModel: provider.defaultModel || "",
      allowedModels: modelsToText(provider.allowedModels || []),
    });
    setMessage(null);
    setError(null);
  }

  async function saveProvider() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        ...form,
        allowedModels: textToModels(form.allowedModels),
      };

      const response = await fetch(editingId ? `/api/admin/ai-providers/${editingId}` : "/api/admin/ai-providers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Tallennus epäonnistui");

      setMessage("AI-palvelu tallennettu.");
      resetForm();
      await fetchProviders();
    } catch (err: any) {
      setError(err.message || "Tallennus epäonnistui");
    } finally {
      setSaving(false);
    }
  }

  async function testProvider(provider: ProviderCredential) {
    setTestingId(provider.id);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/ai-providers/${provider.id}/test`, { method: "POST" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Testaus epäonnistui");

      setMessage("Yhteystesti onnistui.");
      await fetchProviders();
    } catch (err: any) {
      setError(err.message || "Testaus epäonnistui");
      await fetchProviders();
    } finally {
      setTestingId(null);
    }
  }

  async function deleteProvider(provider: ProviderCredential) {
    if (!confirm(`Poistetaanko AI-palvelun ${provider.provider} tallennettu API-avain?`)) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/ai-providers/${provider.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Poisto epäonnistui");

      setMessage("AI-palvelu poistettu.");
      if (editingId === provider.id) resetForm();
      await fetchProviders();
    } catch (err: any) {
      setError(err.message || "Poisto epäonnistui");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
            <KeyRound size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI-palveluiden API-avaimet</h1>
            <p className="text-sm text-slate-500">Hallinnoi sivuston yhteisiä AI API-avaimia. Avaimia ei näytetä käyttöliittymässä tallennuksen jälkeen.</p>
          </div>
        </div>

        <button onClick={fetchProviders} disabled={loading} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          Päivitä
        </button>
      </header>

      {(message || error) && (
        <div className={`rounded-2xl px-5 py-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
          {error || message}
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{editingId ? "Muokkaa AI-palvelua" : "Lisää / korvaa AI-palvelun avain"}</h2>
          <p className="text-xs text-slate-500 mt-1">Jos päivität olemassa olevaa palvelua ilman uutta API-avainta, vanha avain säilyy.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} disabled={!!editingId} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60">
            {providerOptions.map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
          <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="Nimi / label" className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <input value={form.defaultModel} onChange={(event) => setForm({ ...form, defaultModel: event.target.value })} placeholder="Oletusmalli" className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <input type="password" value={form.secret} onChange={(event) => setForm({ ...form, secret: event.target.value })} placeholder={editingId ? "Uusi API-avain (valinnainen)" : "API-avain"} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <input value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} placeholder="Base URL (valinnainen)" className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <input value={form.allowedModels} onChange={(event) => setForm({ ...form, allowedModels: event.target.value })} placeholder="Sallitut mallit pilkulla" className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2 font-semibold text-slate-600"><input type="checkbox" checked={form.isEnabled} onChange={(event) => setForm({ ...form, isEnabled: event.target.checked })} /> Käytössä</label>
          <label className="inline-flex items-center gap-2 font-semibold text-slate-600"><input type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} /> Oletuspalvelu</label>
        </div>

        <div className="flex gap-2">
          <button onClick={saveProvider} disabled={saving || (!editingId && !form.secret.trim())} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Tallenna
          </button>
          {editingId && <button onClick={resetForm} className="px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Peruuta</button>}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Tallennetut AI-palvelut</h2>
        {providers.length === 0 && <p className="text-sm text-slate-500">Ei tallennettuja AI-palveluita. Järjestelmä käyttää vielä .env-fallbackia, jos se on määritetty.</p>}
        <div className="space-y-3">
          {providers.map((provider) => (
            <div key={provider.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900">{provider.label || provider.provider}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-bold">{provider.provider}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${provider.isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{provider.isEnabled ? "Käytössä" : "Pois"}</span>
                  {provider.isDefault && <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-bold">Oletus</span>}
                  {provider.lastTestOk === true && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold"><CheckCircle2 size={13} /> Test OK</span>}
                  {provider.lastTestOk === false && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 font-bold"><XCircle size={13} /> Test failed</span>}
                </div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-500">
                  <div>Key: <span className="font-semibold text-slate-700">{provider.keyPreview || "-"}</span></div>
                  <div>Model: <span className="font-semibold text-slate-700">{provider.defaultModel || "-"}</span></div>
                  <div>Testattu: <span className="font-semibold text-slate-700">{formatDate(provider.lastTestedAt)}</span></div>
                  <div>Base URL: <span className="font-semibold text-slate-700">{provider.baseUrl || "-"}</span></div>
                  <div>Allowed: <span className="font-semibold text-slate-700">{modelsToText(provider.allowedModels || []) || "-"}</span></div>
                  <div>Last used: <span className="font-semibold text-slate-700">{formatDate(provider.lastUsedAt)}</span></div>
                </div>
                {provider.lastTestError && <p className="mt-2 text-xs text-red-600">{provider.lastTestError}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => editProvider(provider)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Muokkaa</button>
                <button onClick={() => testProvider(provider)} disabled={testingId === provider.id} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-100 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50">
                  {testingId === provider.id && <Loader2 size={14} className="animate-spin" />}
                  Testaa
                </button>
                <button onClick={() => deleteProvider(provider)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-100 text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100"><Trash2 size={14} /> Poista</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
