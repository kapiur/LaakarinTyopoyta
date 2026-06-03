"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Loader2, Save } from "lucide-react";
import { useI18n } from "../lib/useI18n";
import { aiAdminT } from "./ai-admin/aiAdminI18n";

type Registry = Record<string, { label: string; models: Array<{ id: string; label: string }> }>;

type AiSettings = {
  defaultProvider: string;
  defaultModel: string;
  allowAgentModelSelection: boolean;
  credentialMode: "platform" | "user" | "auto";
};

type AiPolicy = {
  allowPlatformCredentials: boolean;
  allowUserCredentials: boolean;
  requireUserCredentials: boolean;
  allowedProviders: string[];
};

const defaultSettings: AiSettings = {
  defaultProvider: "openai",
  defaultModel: "gpt-5.4",
  allowAgentModelSelection: true,
  credentialMode: "platform",
};

export default function AiProviderSettingsCard() {
  const { language } = useI18n();
  const tt = (key: string) => aiAdminT(language, "userSettings", key);
  const tc = (key: string) => aiAdminT(language, "common", key);
  const [settings, setSettings] = useState<AiSettings>(defaultSettings);
  const [policy, setPolicy] = useState<AiPolicy | null>(null);
  const [registry, setRegistry] = useState<Registry>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const providerOptions = useMemo(() => {
    const entries = Object.entries(registry);
    if (!policy || policy.allowedProviders.length === 0) return entries;
    return entries.filter(([key]) => policy.allowedProviders.includes(key));
  }, [registry, policy]);

  const modelOptions = useMemo(() => {
    return registry[settings.defaultProvider]?.models || [];
  }, [registry, settings.defaultProvider]);

  async function loadSettings() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/ai-settings");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || tt("loadFailed"));

      setSettings(data.settings || defaultSettings);
      setPolicy(data.policy || null);
      setRegistry(data.registry || {});
    } catch (err: any) {
      setError(err.message || tt("loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  async function saveSettings() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/profile/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || tt("saveFailed"));

      setMessage(tt("saved"));
      await loadSettings();
    } catch (err: any) {
      setError(err.message || tt("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const credentialOptions = [
    { value: "platform", label: tt("platformCredential"), enabled: policy?.allowPlatformCredentials !== false },
    { value: "user", label: tt("userCredential"), enabled: policy?.allowUserCredentials === true },
    { value: "auto", label: tt("autoCredential"), enabled: policy?.allowUserCredentials === true || policy?.allowPlatformCredentials !== false },
  ] as const;

  return (
    <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
          <BrainCircuit size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{tt("title")}</h2>
          <p className="text-sm text-slate-500">{tt("description")}</p>
        </div>
      </div>

      {(message || error) && (
        <div className={`rounded-2xl px-5 py-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
          {error || message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> {tc("loading")}</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tt("provider")}</span>
              <select
                value={settings.defaultProvider}
                onChange={(event) => setSettings({ ...settings, defaultProvider: event.target.value, defaultModel: registry[event.target.value]?.models?.[0]?.id || settings.defaultModel })}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              >
                {providerOptions.map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tt("model")}</span>
              <input
                list="ai-model-options"
                value={settings.defaultModel}
                onChange={(event) => setSettings({ ...settings, defaultModel: event.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="gpt-5.4"
              />
              <datalist id="ai-model-options">
                {modelOptions.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
              </datalist>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tt("credentialMode")}</span>
              <select
                value={settings.credentialMode}
                onChange={(event) => setSettings({ ...settings, credentialMode: event.target.value as AiSettings["credentialMode"] })}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              >
                {credentialOptions.map((option) => <option key={option.value} value={option.value} disabled={!option.enabled}>{option.label}</option>)}
              </select>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={settings.allowAgentModelSelection}
                onChange={(event) => setSettings({ ...settings, allowAgentModelSelection: event.target.checked })}
              />
              {tt("allowAgentModelSelection")}
            </label>
          </div>

          {policy?.requireUserCredentials && (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 px-5 py-4 text-sm font-semibold">
              {tt("userCredentialRequired")}
            </div>
          )}

          <button onClick={saveSettings} disabled={saving} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {tt("saveButton")}
          </button>
        </div>
      )}
    </section>
  );
}
