"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Copy,
  FileText,
  FlaskConical,
  Languages,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Scissors,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useI18n } from "../../lib/useI18n";

type ProfileMode = "none" | "styleOnly" | "workContextOnly" | "full";
type UiLang = "fi" | "ru" | "en";

type AiTool = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  icon: string | null;
  prompt: string;
  isActive: boolean;
  order: number;
  useUserAiProfile?: boolean;
  profileMode?: ProfileMode;
  createdAt: string;
  updatedAt: string;
};

const iconOptions = [
  { value: "FileText", label: "FileText", icon: FileText },
  { value: "ListChecks", label: "ListChecks", icon: ListChecks },
  { value: "Languages", label: "Languages", icon: Languages },
  { value: "Scissors", label: "Scissors", icon: Scissors },
  { value: "FlaskConical", label: "FlaskConical", icon: FlaskConical },
];

const profileModeTexts = {
  fi: {
    useProfile: "Käytä käyttäjän AI-profiilia tässä työkalussa",
    modeLabel: "AI-profiilin käyttötila",
    help: "Full sopii esim. loppuarvioihin ja lähetteisiin. Style only sopii tekstin korjaukseen. Off sopii labroihin ja hyvin tarkkoihin formaatteihin.",
    modes: {
      full: { label: "Full", description: "Työrooli + kirjoitustyyli" },
      styleOnly: { label: "Style only", description: "Vain kirjoitustyyli ja rakenne" },
      workContextOnly: { label: "Work context", description: "Vain työrooli ja kliininen ympäristö" },
      none: { label: "Off", description: "Ei käytetä AI-profiilia" },
    },
  },
  ru: {
    useProfile: "Использовать AI-профиль пользователя в этом инструменте",
    modeLabel: "Режим использования AI-профиля",
    help: "Full подходит для loppuarvio и направлений. Style only подходит для исправления текста. Off подходит для лабораторий и строгих форматов.",
    modes: {
      full: { label: "Full", description: "Рабочая роль + стиль письма" },
      styleOnly: { label: "Style only", description: "Только стиль письма и структура" },
      workContextOnly: { label: "Work context", description: "Только рабочая роль и клиническая среда" },
      none: { label: "Off", description: "AI-профиль не используется" },
    },
  },
  en: {
    useProfile: "Use the user's AI profile in this tool",
    modeLabel: "AI profile mode",
    help: "Full is suitable for discharge summaries and referrals. Style only is suitable for text correction. Off is suitable for labs and strict formats.",
    modes: {
      full: { label: "Full", description: "Work role + writing style" },
      styleOnly: { label: "Style only", description: "Only writing style and structure" },
      workContextOnly: { label: "Work context", description: "Only work role and clinical environment" },
      none: { label: "Off", description: "AI profile is not used" },
    },
  },
};

const profileModeValues: ProfileMode[] = ["full", "styleOnly", "workContextOnly", "none"];

const emptyForm = {
  id: "",
  label: "",
  description: "",
  icon: "FileText",
  prompt: "",
  order: 100,
  isActive: true,
  useUserAiProfile: true,
  profileMode: "full" as ProfileMode,
};

export default function AiToolsPage() {
  const { t, language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const profileI18n = profileModeTexts[lang];
  const [tools, setTools] = useState<AiTool[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [idea, setIdea] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);
  const [status, setStatus] = useState("");

  const isEditing = Boolean(form.id);
  const hasCurrentPrompt = Boolean(form.prompt.trim());
  const selectedTool = useMemo(() => tools.find((tool) => tool.id === form.id) ?? null, [tools, form.id]);

  const loadTools = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai-tools?view=manage");
      if (!response.ok) throw new Error(t("aiTools.loadingFailed"));
      const data = await response.json();
      setTools(Array.isArray(data.tools) ? data.tools : []);
    } catch (error) {
      console.error(error);
      setStatus(t("aiTools.loadingFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setIdea("");
    setStatus("");
  };

  const selectTool = (tool: AiTool) => {
    setForm({
      id: tool.id,
      label: tool.label,
      description: tool.description ?? "",
      icon: tool.icon ?? "FileText",
      prompt: tool.prompt,
      order: tool.order,
      isActive: tool.isActive,
      useUserAiProfile: tool.useUserAiProfile !== false,
      profileMode: tool.profileMode ?? "full",
    });
    setIdea("");
    setStatus("");
  };

  const saveTool = async () => {
    if (!form.label.trim() || !form.prompt.trim()) {
      setStatus(t("aiTools.labelAndPromptRequired"));
      return;
    }

    setIsSaving(true);
    setStatus("");

    try {
      const payload = {
        label: form.label,
        description: form.description,
        icon: form.icon,
        prompt: form.prompt,
        order: form.order,
        isActive: form.isActive,
        useUserAiProfile: form.useUserAiProfile,
        profileMode: form.useUserAiProfile ? form.profileMode : "none",
      };

      const response = await fetch(isEditing ? `/api/ai-tools/${form.id}` : "/api/ai-tools", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(t("aiTools.saveFailed"));

      const data = await response.json();
      setStatus(t("common.saved"));
      await loadTools();

      if (data.tool?.id) {
        setForm({
          id: data.tool.id,
          label: data.tool.label,
          description: data.tool.description ?? "",
          icon: data.tool.icon ?? "FileText",
          prompt: data.tool.prompt ?? form.prompt,
          order: data.tool.order ?? form.order,
          isActive: data.tool.isActive ?? form.isActive,
          useUserAiProfile: data.tool.useUserAiProfile !== false,
          profileMode: data.tool.profileMode ?? "full",
        });
      }
    } catch (error) {
      console.error(error);
      setStatus(t("aiTools.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTool = async () => {
    if (!form.id) return;
    if (!confirm(t("aiTools.deleteConfirm"))) return;

    setIsSaving(true);
    setStatus("");

    try {
      const response = await fetch(`/api/ai-tools/${form.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(t("aiTools.deleteFailed"));
      setStatus(t("aiTools.deleted"));
      resetForm();
      await loadTools();
    } catch (error) {
      console.error(error);
      setStatus(t("aiTools.deleteFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const generatePrompt = async () => {
    if (!idea.trim() && !form.prompt.trim()) {
      setStatus(t("aiTools.describeFirst"));
      return;
    }

    setIsAssistantLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/ai-tools/prompt-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: idea, currentPrompt: form.prompt }),
      });

      if (!response.ok) throw new Error(t("aiTools.assistantFailed"));
      const data = await response.json();

      if (typeof data.prompt === "string" && data.prompt.trim()) {
        setForm((prev) => ({ ...prev, prompt: data.prompt.trim() }));
        setStatus(t("aiTools.assistantUpdated"));
      }
    } catch (error) {
      console.error(error);
      setStatus(t("aiTools.assistantFailed"));
    } finally {
      setIsAssistantLoading(false);
    }
  };

  const IconPreview = iconOptions.find((item) => item.value === form.icon)?.icon ?? FileText;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bot className="text-blue-600" size={26} /> {t("aiTools.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">{t("aiTools.subtitle")}</p>
        </div>
        <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm">
          <Plus size={16} /> {t("aiTools.newTool")}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-slate-800">{t("aiTools.ownTools")}</h2>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-6"><Loader2 size={16} className="animate-spin" /> {t("common.loading")}</div>
          ) : tools.length === 0 ? (
            <div className="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4">{t("aiTools.noTools")}</div>
          ) : (
            <div className="space-y-2">
              {tools.map((tool) => {
                const ToolIcon = iconOptions.find((item) => item.value === tool.icon)?.icon ?? FileText;
                return (
                  <button key={tool.id} onClick={() => selectTool(tool)} className={`w-full text-left p-3 rounded-xl border transition-all ${selectedTool?.id === tool.id ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200"}`}>
                    <div className="flex items-center gap-2">
                      <ToolIcon size={16} className={tool.isActive ? "text-blue-600" : "text-slate-400"} />
                      <span className="font-bold text-sm text-slate-800">{tool.label}</span>
                      {!tool.isActive && <span className="text-[10px] font-bold text-slate-400 uppercase">{t("aiTools.hidden")}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tool.description || t("aiTools.noDescription")}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><IconPreview size={18} className="text-blue-600" /> {isEditing ? t("aiTools.editTool") : t("aiTools.createTool")}</h2>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} className="w-4 h-4" />
                {t("aiTools.showOnHome")}
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">{t("aiTools.name")}</span>
                <input value={form.label} onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))} placeholder="Esim. Loppuarvio" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">{t("aiTools.icon")}</span>
                <select value={form.icon} onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300">
                  {iconOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-xs font-bold text-slate-500 uppercase">{t("aiTools.description")}</span>
              <input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Lyhyt kuvaus työkalun tarkoituksesta" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={form.useUserAiProfile} onChange={(e) => setForm((prev) => ({ ...prev, useUserAiProfile: e.target.checked, profileMode: e.target.checked ? prev.profileMode : "none" }))} />
                {profileI18n.useProfile}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">{profileI18n.modeLabel}</span>
                  <select disabled={!form.useUserAiProfile} value={form.useUserAiProfile ? form.profileMode : "none"} onChange={(e) => setForm((prev) => ({ ...prev, profileMode: e.target.value as ProfileMode }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 disabled:bg-slate-100 disabled:text-slate-400">
                    {profileModeValues.map((value) => {
                      const option = profileI18n.modes[value];
                      return <option key={value} value={value}>{option.label} — {option.description}</option>;
                    })}
                  </select>
                </label>
                <div className="text-xs text-slate-500 leading-relaxed bg-white border border-slate-100 rounded-xl p-3">{profileI18n.help}</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm p-5 space-y-4">
              <div>
                <h2 className="font-bold text-slate-800 flex items-center gap-2"><Sparkles size={18} className="text-blue-600" /> {t("aiTools.promptAssistant")}</h2>
                <p className="text-sm text-slate-600 mt-1">{t("aiTools.promptAssistantDescription")}</p>
                <p className="text-xs text-blue-700 bg-white/70 border border-blue-100 rounded-xl px-3 py-2 mt-3">{hasCurrentPrompt ? t("aiTools.promptAssistantEditNotice") : t("aiTools.promptAssistantCreateNotice")}</p>
              </div>
              <textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={t("aiTools.promptAssistantPlaceholder")} className="w-full h-32 rounded-xl border border-blue-100 bg-white/80 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
              <button onClick={generatePrompt} disabled={isAssistantLoading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black disabled:opacity-50 shadow-sm">
                {isAssistantLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {hasCurrentPrompt ? t("aiTools.improveCurrentPrompt") : t("aiTools.createPrompt")}
              </button>
            </div>

            <label className="space-y-1 block">
              <span className="text-xs font-bold text-slate-500 uppercase">{t("aiTools.prompt")}</span>
              <textarea value={form.prompt} onChange={(e) => setForm((prev) => ({ ...prev, prompt: e.target.value }))} placeholder={t("aiTools.promptPlaceholder")} className="w-full h-72 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 font-mono leading-relaxed" />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500">{status}</div>
              <div className="flex gap-2">
                {isEditing && <button onClick={deleteTool} disabled={isSaving} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 disabled:opacity-50"><Trash2 size={16} /> {t("common.delete")}</button>}
                <button onClick={() => navigator.clipboard.writeText(form.prompt)} disabled={!form.prompt} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"><Copy size={16} /> {t("common.copy")}</button>
                <button onClick={saveTool} disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 shadow-sm">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {t("common.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
