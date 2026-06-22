"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, KeyRound, Loader2, Save, Trash2 } from "lucide-react";
import { useI18n } from "../lib/useI18n";
import { SUPPORTED_UI_LANGUAGES } from "../lib/i18n/config";
import { aiAdminT } from "./ai-admin/aiAdminI18n";

type Registry = Record<string, { label: string; models: Array<{ id: string; label: string }> }>;

type AiSettings = {
  defaultProvider: string;
  defaultModel: string;
  allowAgentModelSelection: boolean;
  credentialMode: "platform" | "user" | "auto";
  assistantResponseMode: "request" | "fixed";
  assistantFixedLanguage: string;
};

type AiPolicy = {
  allowPlatformCredentials: boolean;
  allowUserCredentials: boolean;
  requireUserCredentials: boolean;
  allowedProviders: string[];
};

type PersonalCredentialSummary = {
  provider: string;
  keyPreview?: string | null;
  baseUrl?: string | null;
  projectId?: string | null;
  defaultModel?: string | null;
  lastUsedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const defaultSettings: AiSettings = {
  defaultProvider: "openai",
  defaultModel: "gpt-5.4",
  allowAgentModelSelection: true,
  credentialMode: "platform",
  assistantResponseMode: "request",
  assistantFixedLanguage: "fi",
};

export default function AiProviderSettingsCard() {
  const { language } = useI18n();
  const tt = (key: string) => aiAdminT(language, "userSettings", key);
  const tc = (key: string) => aiAdminT(language, "common", key);
  const assistantLanguageOptions = useMemo(
    () =>
      SUPPORTED_UI_LANGUAGES.map((option) => ({
        value: option.code,
        label: `${option.nativeName} (${option.code})`,
      })),
    []
  );
  const [settings, setSettings] = useState<AiSettings>(defaultSettings);
  const [policy, setPolicy] = useState<AiPolicy | null>(null);
  const [registry, setRegistry] = useState<Registry>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [credentialSaving, setCredentialSaving] = useState(false);
  const [credentialDeleting, setCredentialDeleting] = useState(false);
  const [personalCredentials, setPersonalCredentials] = useState<PersonalCredentialSummary[]>([]);
  const [personalSecret, setPersonalSecret] = useState("");
  const [personalProjectId, setPersonalProjectId] = useState("");
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

  const currentPersonalCredential = useMemo(
    () => personalCredentials.find((credential) => credential.provider === settings.defaultProvider) ?? null,
    [personalCredentials, settings.defaultProvider]
  );

  async function loadSettings() {
    setLoading(true);
    setError(null);

    try {
      const [settingsResponse, credentialsResponse] = await Promise.all([
        fetch("/api/profile/ai-settings"),
        fetch("/api/profile/ai-credentials"),
      ]);
      const settingsData = await settingsResponse.json();
      const credentialsData = await credentialsResponse.json();

      if (!settingsResponse.ok) throw new Error(settingsData.error || tt("loadFailed"));
      if (!credentialsResponse.ok) throw new Error(credentialsData.error || tt("loadFailed"));

      const loadedSettings = settingsData.settings || defaultSettings;
      setSettings({
        ...defaultSettings,
        ...loadedSettings,
        assistantFixedLanguage: loadedSettings.assistantFixedLanguage || defaultSettings.assistantFixedLanguage,
      });
      setPolicy(settingsData.policy || null);
      setRegistry(settingsData.registry || {});
      setPersonalCredentials(Array.isArray(credentialsData.credentials) ? credentialsData.credentials : []);
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

  useEffect(() => {
    if (settings.defaultProvider === "yandex") {
      setPersonalProjectId(currentPersonalCredential?.projectId || "");
      return;
    }

    setPersonalProjectId("");
  }, [currentPersonalCredential?.projectId, settings.defaultProvider]);

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

  async function savePersonalCredential() {
    if (!personalSecret.trim()) {
      setError(tt("personalCredentialSaveFailed"));
      return;
    }

    setCredentialSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/profile/ai-credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.defaultProvider,
          secret: personalSecret,
          projectId: personalProjectId,
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || tt("personalCredentialSaveFailed"));

      setMessage(tt("personalCredentialSaved"));
      setPersonalSecret("");
      setPersonalProjectId("");
      await loadSettings();
    } catch (err: any) {
      setError(err.message || tt("personalCredentialSaveFailed"));
    } finally {
      setCredentialSaving(false);
    }
  }

  async function deletePersonalCredential() {
    setCredentialDeleting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/profile/ai-credentials?provider=${encodeURIComponent(settings.defaultProvider)}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || tt("personalCredentialDeleteFailed"));

      setMessage(tt("personalCredentialDeleted"));
      await loadSettings();
    } catch (err: any) {
      setError(err.message || tt("personalCredentialDeleteFailed"));
    } finally {
      setCredentialDeleting(false);
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

            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tt("assistantResponseMode")}</span>
              <select
                value={settings.assistantResponseMode}
                onChange={(event) => setSettings({ ...settings, assistantResponseMode: event.target.value as AiSettings["assistantResponseMode"] })}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="request">{tt("assistantResponseModeRequest")}</option>
                <option value="fixed">{tt("assistantResponseModeFixed")}</option>
              </select>
              <p className="text-xs text-slate-500">
                {settings.assistantResponseMode === "fixed" ? tt("assistantResponseHelpFixed") : tt("assistantResponseHelpRequest")}
              </p>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tt("assistantFixedLanguage")}</span>
              <select
                value={settings.assistantFixedLanguage}
                onChange={(event) => setSettings({ ...settings, assistantFixedLanguage: event.target.value })}
                disabled={settings.assistantResponseMode !== "fixed"}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              >
                {assistantLanguageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <p className="text-xs text-slate-500">{tt("assistantLanguageDescription")}</p>
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

          {(policy?.allowUserCredentials || policy?.requireUserCredentials) && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{tt("personalCredentialTitle")}</h3>
                  <p className="text-sm text-slate-500">{tt("personalCredentialDescription")}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                <div className="space-y-3">
                  <label className="space-y-1 block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tt("userCredential")}</span>
                    <input
                      type="password"
                      value={personalSecret}
                      onChange={(event) => setPersonalSecret(event.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder={tt("personalCredentialPlaceholder")}
                    />
                  </label>
                  {settings.defaultProvider === "yandex" && (
                    <label className="space-y-1 block">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tt("projectIdLabel")}</span>
                      <input
                        type="text"
                        value={personalProjectId}
                        onChange={(event) => setPersonalProjectId(event.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder={tt("projectIdPlaceholder")}
                      />
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  onClick={savePersonalCredential}
                  disabled={credentialSaving}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {credentialSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {tt("savePersonalCredential")}
                </button>
              </div>

              {currentPersonalCredential ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-slate-200 px-4 py-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{tt("personalCredentialSavedPreview")}</div>
                    <div className="text-sm font-semibold text-slate-800">{currentPersonalCredential.keyPreview}</div>
                    {currentPersonalCredential.projectId && (
                      <div className="text-xs text-slate-500">
                        {tt("projectIdLabel")}: <span className="font-semibold text-slate-700">{currentPersonalCredential.projectId}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={deletePersonalCredential}
                    disabled={credentialDeleting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 disabled:opacity-50"
                  >
                    {credentialDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {tt("deletePersonalCredential")}
                  </button>
                </div>
              ) : (
                <div className="text-sm text-slate-500">{tt("personalCredentialMissing")}</div>
              )}
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
