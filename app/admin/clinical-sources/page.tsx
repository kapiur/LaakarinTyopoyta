"use client";

import { useEffect, useMemo, useState } from "react";
import { DatabaseZap, Loader2, RefreshCcw, Save, Trash2 } from "lucide-react";
import { useI18n } from "../../../lib/useI18n";

type ClinicalSource = {
  id: string;
  country: string;
  name: string;
  description: string | null;
  sourceType: string;
  trustLevel: string;
  priority: number;
  baseUrl: string | null;
  allowedDomains: string[];
  language: string[];
  isEnabled: boolean;
  isOfficial: boolean;
  specialty: string | null;
  createdAt: string;
  updatedAt: string;
};

type Options = {
  countries: string[];
  sourceTypes: string[];
  trustLevels: string[];
};

type FormState = {
  id: string;
  country: string;
  name: string;
  description: string;
  sourceType: string;
  trustLevel: string;
  priority: number;
  baseUrl: string;
  allowedDomains: string;
  language: string;
  isEnabled: boolean;
  isOfficial: boolean;
  specialty: string;
};

const emptyForm: FormState = {
  id: "",
  country: "FI",
  name: "",
  description: "",
  sourceType: "national_guideline",
  trustLevel: "primary_guideline",
  priority: 100,
  baseUrl: "",
  allowedDomains: "",
  language: "fi",
  isEnabled: true,
  isOfficial: true,
  specialty: "",
};

const labels = {
  fi: {
    title: "Kliiniset lähteet",
    description: "Ylläpidä AI-agentin sallittuja kliinisiä lähteitä. Vain admin voi muuttaa trust level -arvoja.",
    create: "Luo uusi lähde",
    edit: "Muokkaa lähdettä",
    savedSources: "Tallennetut lähteet",
    refresh: "Päivitä",
    save: "Tallenna lähde",
    cancel: "Peruuta",
    delete: "Poista",
    enabled: "Käytössä",
    official: "Virallinen lähde",
    saved: "Tallennettu",
    deleted: "Poistettu",
    loadFailed: "Lähteiden lataus epäonnistui",
    saveFailed: "Tallennus epäonnistui",
    deleteFailed: "Poisto epäonnistui",
    deleteConfirm: "Poistetaanko tämä kliininen lähde?",
    allCountries: "Kaikki maat",
    help: "Huomio: käyttäjä voi /settings-sivulla vain kytkeä adminin sallimia lähteitä päälle tai pois. Käyttäjä ei voi muuttaa lähteen luottamustasoa.",
  },
  ru: {
    title: "Клинические источники",
    description: "Управление разрешёнными клиническими источниками для AI-агента. Только admin может менять trust level.",
    create: "Создать новый источник",
    edit: "Редактировать источник",
    savedSources: "Сохранённые источники",
    refresh: "Обновить",
    save: "Сохранить источник",
    cancel: "Отмена",
    delete: "Удалить",
    enabled: "Включён",
    official: "Официальный источник",
    saved: "Сохранено",
    deleted: "Удалено",
    loadFailed: "Не удалось загрузить источники",
    saveFailed: "Не удалось сохранить",
    deleteFailed: "Не удалось удалить",
    deleteConfirm: "Удалить этот клинический источник?",
    allCountries: "Все страны",
    help: "Важно: пользователь в /settings может только включать или отключать источники, разрешённые admin. Пользователь не может менять уровень доверия источника.",
  },
  en: {
    title: "Clinical sources",
    description: "Manage allowed clinical sources for the AI agent. Only admins can change trust levels.",
    create: "Create source",
    edit: "Edit source",
    savedSources: "Saved sources",
    refresh: "Refresh",
    save: "Save source",
    cancel: "Cancel",
    delete: "Delete",
    enabled: "Enabled",
    official: "Official source",
    saved: "Saved",
    deleted: "Deleted",
    loadFailed: "Failed to load sources",
    saveFailed: "Failed to save",
    deleteFailed: "Failed to delete",
    deleteConfirm: "Delete this clinical source?",
    allCountries: "All countries",
    help: "Note: users can only enable or disable admin-approved sources in /settings. Users cannot change source trust levels.",
  },
} as const;

function listToText(value: string[]) {
  return value.join(", ");
}

function sourceToForm(source: ClinicalSource): FormState {
  return {
    id: source.id,
    country: source.country,
    name: source.name,
    description: source.description || "",
    sourceType: source.sourceType,
    trustLevel: source.trustLevel,
    priority: source.priority,
    baseUrl: source.baseUrl || "",
    allowedDomains: listToText(source.allowedDomains || []),
    language: listToText(source.language || []),
    isEnabled: source.isEnabled,
    isOfficial: source.isOfficial,
    specialty: source.specialty || "",
  };
}

export default function AdminClinicalSourcesPage() {
  const { language } = useI18n();
  const l = labels[language] || labels.fi;
  const [sources, setSources] = useState<ClinicalSource[]>([]);
  const [options, setOptions] = useState<Options>({ countries: ["FI", "RU"], sourceTypes: [], trustLevels: [] });
  const [countryFilter, setCountryFilter] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleSources = useMemo(() => sources, [sources]);

  async function loadSources() {
    setLoading(true);
    setError(null);
    try {
      const suffix = countryFilter ? `?country=${encodeURIComponent(countryFilter)}` : "";
      const res = await fetch(`/api/admin/clinical-sources${suffix}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || l.loadFailed);
      setSources(data.sources || []);
      setOptions(data.options || options);
    } catch (err: any) {
      setError(err.message || l.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryFilter, language]);

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, country: countryFilter || "FI" });
  }

  function editSource(source: ClinicalSource) {
    setEditingId(source.id);
    setForm(sourceToForm(source));
    setMessage(null);
    setError(null);
  }

  async function saveSource() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        ...form,
        id: form.id.trim() || undefined,
      };
      const res = await fetch(editingId ? `/api/admin/clinical-sources/${encodeURIComponent(editingId)}` : "/api/admin/clinical-sources", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || l.saveFailed);
      setMessage(l.saved);
      resetForm();
      await loadSources();
    } catch (err: any) {
      setError(err.message || l.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSource(source: ClinicalSource) {
    if (!confirm(l.deleteConfirm)) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/admin/clinical-sources/${encodeURIComponent(source.id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || l.deleteFailed);
      setMessage(l.deleted);
      if (editingId === source.id) resetForm();
      await loadSources();
    } catch (err: any) {
      setError(err.message || l.deleteFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
            <DatabaseZap size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{l.title}</h1>
            <p className="text-sm text-slate-500">{l.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)} className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600">
            <option value="">{l.allCountries}</option>
            {options.countries.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
          <button onClick={loadSources} disabled={loading} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            {l.refresh}
          </button>
        </div>
      </header>

      {(message || error) && (
        <div className={`rounded-2xl px-5 py-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
          {error || message}
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{editingId ? l.edit : l.create}</h2>
          <p className="text-xs text-slate-500 mt-1">{l.help}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} disabled={!!editingId} placeholder="id (optional)" className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60" />
          <select value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100">
            {options.countries.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <select value={form.sourceType} onChange={(event) => setForm({ ...form, sourceType: event.target.value })} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100">
            {options.sourceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select value={form.trustLevel} onChange={(event) => setForm({ ...form, trustLevel: event.target.value })} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100">
            {options.trustLevels.map((trustLevel) => <option key={trustLevel} value={trustLevel}>{trustLevel}</option>)}
          </select>
          <input type="number" value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })} placeholder="Priority" className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <input value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} placeholder="Base URL" className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <input value={form.allowedDomains} onChange={(event) => setForm({ ...form, allowedDomains: event.target.value })} placeholder="Allowed domains, comma separated" className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <input value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} placeholder="Languages, comma separated" className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <input value={form.specialty} onChange={(event) => setForm({ ...form, specialty: event.target.value })} placeholder="Specialty (optional)" className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
        </div>

        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" rows={3} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2 font-semibold text-slate-600"><input type="checkbox" checked={form.isEnabled} onChange={(event) => setForm({ ...form, isEnabled: event.target.checked })} /> {l.enabled}</label>
          <label className="inline-flex items-center gap-2 font-semibold text-slate-600"><input type="checkbox" checked={form.isOfficial} onChange={(event) => setForm({ ...form, isOfficial: event.target.checked })} /> {l.official}</label>
        </div>

        <div className="flex gap-2">
          <button onClick={saveSource} disabled={saving || !form.name.trim()} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {l.save}
          </button>
          {editingId && <button onClick={resetForm} className="px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">{l.cancel}</button>}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">{l.savedSources}</h2>
        {visibleSources.length === 0 && <p className="text-sm text-slate-500">-</p>}
        <div className="space-y-3">
          {visibleSources.map((source) => (
            <div key={source.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900">{source.name}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-bold">{source.country}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-bold">{source.sourceType}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 font-bold">{source.trustLevel}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${source.isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{source.isEnabled ? l.enabled : "disabled"}</span>
                  {source.isOfficial && <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-bold">official</span>}
                </div>
                <p className="mt-2 text-xs text-slate-500">{source.description || "-"}</p>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-500">
                  <div>ID: <span className="font-semibold text-slate-700">{source.id}</span></div>
                  <div>Priority: <span className="font-semibold text-slate-700">{source.priority}</span></div>
                  <div>Base URL: <span className="font-semibold text-slate-700">{source.baseUrl || "-"}</span></div>
                  <div>Domains: <span className="font-semibold text-slate-700">{listToText(source.allowedDomains || []) || "-"}</span></div>
                  <div>Languages: <span className="font-semibold text-slate-700">{listToText(source.language || []) || "-"}</span></div>
                  <div>Specialty: <span className="font-semibold text-slate-700">{source.specialty || "-"}</span></div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => editSource(source)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Edit</button>
                <button onClick={() => deleteSource(source)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-100 text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100"><Trash2 size={14} /> {l.delete}</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
