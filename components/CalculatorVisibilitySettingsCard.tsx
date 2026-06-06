"use client";

import { useEffect, useState } from "react";
import { Activity, Baby, Calculator, Heart, Loader2, RotateCcw, ShieldAlert, Stethoscope, Wind, Zap } from "lucide-react";
import { useI18n } from "../lib/useI18n";

type UiLang = "fi" | "ru" | "en";

type CalculatorVisibilityItem = {
  key: string;
  title: string;
  description: string;
  icon: "Zap" | "Baby" | "ShieldAlert" | "Wind" | "Stethoscope" | "Heart" | "Activity" | "Calculator";
  category: string;
  status: "active" | "legacy";
  route: string;
  isVisible: boolean;
};

const iconMap = {
  Zap,
  Baby,
  ShieldAlert,
  Wind,
  Stethoscope,
  Heart,
  Activity,
  Calculator,
};

const texts = {
  fi: {
    title: "Laskurit",
    description: "Valitse, mitkä laskurit näkyvät sinulle laskurien etusivulla. Tämä ei poista laskureita järjestelmästä, vaan hallitsee omaa näkyvyyttäsi.",
    loading: "Ladataan laskureita...",
    loadFailed: "Laskurien näkyvyysasetusten lataus epäonnistui.",
    saveFailed: "Laskurin näkyvyysasetuksen tallennus epäonnistui.",
    reset: "Palauta oletukset",
    resetFailed: "Laskurien oletusasetusten palautus epäonnistui.",
    visible: "Näkyy sinulle",
    hidden: "Piilotettu sinulta",
    legacy: "Legacy-näkymä",
  },
  ru: {
    title: "Калькуляторы",
    description: "Выберите, какие калькуляторы будут показываться вам на главной странице раздела калькуляторов. Это не удаляет калькуляторы из системы, а управляет только вашей видимостью.",
    loading: "Загрузка калькуляторов...",
    loadFailed: "Не удалось загрузить настройки видимости калькуляторов.",
    saveFailed: "Не удалось сохранить настройку видимости калькулятора.",
    reset: "Вернуть стандартные настройки",
    resetFailed: "Не удалось вернуть стандартные настройки калькуляторов.",
    visible: "Показывается вам",
    hidden: "Скрыто от вас",
    legacy: "Legacy-экран",
  },
  en: {
    title: "Calculators",
    description: "Choose which calculators are shown to you on the calculator home page. This does not remove calculators from the system; it only controls your own visibility.",
    loading: "Loading calculators...",
    loadFailed: "Could not load calculator visibility settings.",
    saveFailed: "Could not save calculator visibility setting.",
    reset: "Restore defaults",
    resetFailed: "Could not restore calculator defaults.",
    visible: "Shown to you",
    hidden: "Hidden from you",
    legacy: "Legacy view",
  },
} as const;

export default function CalculatorVisibilitySettingsCard() {
  const { language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const i18n = texts[lang];
  const [calculators, setCalculators] = useState<CalculatorVisibilityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [status, setStatus] = useState("");

  const loadVisibility = async () => {
    setIsLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/calculators/visibility");
      if (!response.ok) throw new Error(i18n.loadFailed);
      const data = await response.json();
      setCalculators(Array.isArray(data.calculators) ? data.calculators : []);
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

  const setCalculatorVisibility = async (calculatorKey: string, isVisible: boolean) => {
    setUpdatingKey(calculatorKey);
    setStatus("");
    setCalculators((prev) => prev.map((calculator) => calculator.key === calculatorKey ? { ...calculator, isVisible } : calculator));

    try {
      const response = await fetch("/api/calculators/visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calculatorKey, isVisible }),
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
      const response = await fetch("/api/calculators/visibility", { method: "DELETE" });
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
          {calculators.map((calculator) => {
            const Icon = iconMap[calculator.icon] ?? Calculator;
            const isUpdating = updatingKey === calculator.key;

            return (
              <div key={calculator.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${calculator.isVisible ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-400"}`}>
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-800">{calculator.title}</div>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">{calculator.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <div className={`text-[10px] font-bold uppercase ${calculator.isVisible ? "text-emerald-600" : "text-slate-400"}`}>
                        {calculator.isVisible ? i18n.visible : i18n.hidden}
                      </div>
                      {calculator.status === "legacy" && (
                        <div className="text-[10px] font-bold uppercase text-amber-600">
                          {i18n.legacy}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={calculator.isVisible}
                    disabled={isUpdating}
                    onChange={(event) => setCalculatorVisibility(calculator.key, event.target.checked)}
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
