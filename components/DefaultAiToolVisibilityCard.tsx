"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  FlaskConical,
  Languages,
  ListChecks,
  Loader2,
  RotateCcw,
  Scissors,
} from "lucide-react";
import { useI18n } from "../lib/useI18n";

type UiLang = "fi" | "ru" | "en";

type DefaultToolVisibility = {
  key: string;
  label: string;
  description: string;
  icon: "ListChecks" | "Languages" | "Scissors" | "FlaskConical" | "FileText";
  isVisible: boolean;
};

const iconMap = {
  ListChecks,
  Languages,
  Scissors,
  FlaskConical,
  FileText,
};

const texts = {
  fi: {
    title: "Järjestelmätyökalut pääsivulla",
    description: "Valitse, mitkä valmiit AI-painikkeet näkyvät pääsivun AI-Tekstityökalussa. Tämä ei poista työkaluja eikä vaikuta omiin AI-työkaluihin.",
    loading: "Ladataan järjestelmätyökaluja...",
    loadFailed: "Järjestelmätyökalujen näkyvyysasetusten lataus epäonnistui.",
    saveFailed: "Näkyvyysasetuksen tallennus epäonnistui.",
    reset: "Palauta oletukset",
    resetFailed: "Oletusten palautus epäonnistui.",
    visible: "Näkyy pääsivulla",
    hidden: "Piilotettu pääsivulta",
  },
  ru: {
    title: "Системные инструменты на главной странице",
    description: "Выберите, какие стандартные AI-кнопки показывать в AI-инструменте на главной странице. Это не удаляет инструменты и не влияет на ваши собственные AI-инструменты.",
    loading: "Загрузка системных инструментов...",
    loadFailed: "Не удалось загрузить настройки видимости системных инструментов.",
    saveFailed: "Не удалось сохранить настройку видимости.",
    reset: "Вернуть стандартные настройки",
    resetFailed: "Не удалось вернуть стандартные настройки.",
    visible: "Показывается на главной",
    hidden: "Скрыто с главной",
  },
  en: {
    title: "System tools on the home page",
    description: "Choose which default AI buttons are shown in the home page AI text tool. This does not delete tools and does not affect your custom AI tools.",
    loading: "Loading system tools...",
    loadFailed: "Could not load system tool visibility settings.",
    saveFailed: "Could not save visibility setting.",
    reset: "Restore defaults",
    resetFailed: "Could not restore defaults.",
    visible: "Shown on home page",
    hidden: "Hidden from home page",
  },
};

export default function DefaultAiToolVisibilityCard() {
  const { language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const i18n = texts[lang];
  const [tools, setTools] = useState<DefaultToolVisibility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [status, setStatus] = useState("");

  const loadVisibility = async () => {
    setIsLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/ai-tools/visibility");
      if (!response.ok) throw new Error(i18n.loadFailed);
      const data = await response.json();
      setTools(Array.isArray(data.tools) ? data.tools : []);
    } catch (error) {
      console.error(error);
      setStatus(i18n.loadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setToolVisibility = async (toolKey: string, isVisible: boolean) => {
    setUpdatingKey(toolKey);
    setStatus("");
    setTools((prev) => prev.map((tool) => tool.key === toolKey ? { ...tool, isVisible } : tool));

    try {
      const response = await fetch("/api/ai-tools/visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolKey, isVisible }),
      });

      if (!response.ok) throw new Error(i18n.saveFailed);
    } catch (error) {
      console.error(error);
      setStatus(i18n.saveFailed);
      await loadVisibility();
    } finally {
      setUpdatingKey(null);
    }
  };

  const resetDefaults = async () => {
    setIsResetting(true);
    setStatus("");
    try {
      const response = await fetch("/api/ai-tools/visibility", { method: "DELETE" });
      if (!response.ok) throw new Error(i18n.resetFailed);
      await loadVisibility();
    } catch (error) {
      console.error(error);
      setStatus(i18n.resetFailed);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-800">{i18n.title}</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">{i18n.description}</p>
        </div>
        <button
          onClick={resetDefaults}
          disabled={isResetting || isLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
        >
          {isResetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          {i18n.reset}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
          <Loader2 size={16} className="animate-spin" /> {i18n.loading}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tools.map((tool) => {
            const Icon = iconMap[tool.icon] ?? FileText;
            const isUpdating = updatingKey === tool.key;

            return (
              <div key={tool.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tool.isVisible ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-400"}`}>
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-800">{tool.label}</div>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">{tool.description}</p>
                    <div className={`mt-2 text-[10px] font-bold uppercase ${tool.isVisible ? "text-emerald-600" : "text-slate-400"}`}>
                      {tool.isVisible ? i18n.visible : i18n.hidden}
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={tool.isVisible}
                    disabled={isUpdating}
                    onChange={(event) => setToolVisibility(tool.key, event.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>
            );
          })}
        </div>
      )}

      {status && <div className="text-xs text-red-500">{status}</div>}
    </div>
  );
}
