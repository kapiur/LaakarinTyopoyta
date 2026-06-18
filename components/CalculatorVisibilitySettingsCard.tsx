"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowDown, ArrowUp, Baby, Calculator, Heart, Loader2, RotateCcw, ShieldAlert, Stethoscope, Wind, Zap } from "lucide-react";
import { useI18n } from "../lib/useI18n";

type UiLang = "fi" | "ru" | "en";

type CalculatorVisibilityItem = {
  key: string;
  title: string;
  description: string;
  icon: "Zap" | "Baby" | "ShieldAlert" | "Wind" | "Stethoscope" | "Heart" | "Activity" | "Calculator";
  category: string;
  route: string;
  customOrder: number | null;
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
    orderFailed: "Laskurien järjestyksen tallennus epäonnistui.",
    reset: "Palauta oletukset",
    resetFailed: "Laskurien oletusasetusten palautus epäonnistui.",
    visible: "Näkyy sinulle",
    hidden: "Piilotettu sinulta",
    orderTitle: "Oma järjestys",
    orderDescription: "Siirrä laskureita ylös tai alas. Tämä järjestys näkyy laskurien etusivulla ja tukee oman työpöydän rakentamista.",
    moveUp: "Siirrä ylemmäs",
    moveDown: "Siirrä alemmas",
    calculatorDescriptions: {
      pca: "PCA-annostelun suunnittelu käyttäjän oman lääkevalikoiman tuella.",
      peds: "Pediatrinen annoslaskuri käyttäjäkohtaisilla indikaatioilla ja lääkevalikoiman oletuksilla.",
      vte: "Syvän laskimotromboosin todennäköisyyden arvio erillisellä Wells-tyylisellä laskurilla.",
      pe: "Keuhkoembolian todennäköisyyden arvio erillisellä Wells-tyylisellä laskurilla.",
      cad: "Sepelvaltimotaudin esitodennäköisyyden arvio erillisessä rakenteisessa laskurissa.",
      chads: "Eteisvärinäpotilaan aivohalvaus- ja vuotoriskin arvio erillisessä kaksoislaskurissa.",
      bmi: "Painoindeksin laskuri.",
      gfr: "Munuaistoiminnan arvio Cockcroft-Gault-tyylisellä kaavalla.",
      abg: "Happo-emästasapainon ja verikaasujen jäsennelty tulkinta anionivajeen, kompensaation, hapetuksen ja DKA-seulan kanssa.",
    },
  },
  ru: {
    title: "Калькуляторы",
    description: "Выберите, какие калькуляторы будут показываться вам на главной странице раздела калькуляторов. Это не удаляет калькуляторы из системы, а управляет только вашей видимостью.",
    loading: "Загрузка калькуляторов...",
    loadFailed: "Не удалось загрузить настройки видимости калькуляторов.",
    saveFailed: "Не удалось сохранить настройку видимости калькулятора.",
    orderFailed: "Не удалось сохранить порядок калькуляторов.",
    reset: "Вернуть стандартные настройки",
    resetFailed: "Не удалось вернуть стандартные настройки калькуляторов.",
    visible: "Показывается вам",
    hidden: "Скрыто от вас",
    orderTitle: "Ваш порядок",
    orderDescription: "Перемещайте калькуляторы вверх и вниз. Этот порядок будет использован на странице калькуляторов и помогает собрать свой рабочий стол.",
    moveUp: "Поднять выше",
    moveDown: "Опустить ниже",
    calculatorDescriptions: {
      pca: "Планирование дозировок PCA с поддержкой вашей пользовательской библиотеки препаратов.",
      peds: "Педиатрический калькулятор дозировок с пользовательскими показаниями и настройками библиотеки препаратов.",
      vte: "Оценка вероятности тромбоза глубоких вен по отдельному калькулятору в стиле Wells.",
      pe: "Оценка вероятности ТЭЛА по отдельному калькулятору в стиле Wells.",
      cad: "Оценка предтестовой вероятности ишемической болезни сердца в отдельном структурированном калькуляторе.",
      chads: "Оценка риска инсульта и кровотечения при фибрилляции предсердий в отдельном двойном калькуляторе.",
      bmi: "Калькулятор индекса массы тела.",
      gfr: "Оценка функции почек по формуле в стиле Cockcroft-Gault.",
      abg: "Структурированная интерпретация КОС и газов крови с расчетом компенсации, AG, оксигенации и проверкой на ДКА.",
    },
  },
  en: {
    title: "Calculators",
    description: "Choose which calculators are shown to you on the calculator home page. This does not remove calculators from the system; it only controls your own visibility.",
    loading: "Loading calculators...",
    loadFailed: "Could not load calculator visibility settings.",
    saveFailed: "Could not save calculator visibility setting.",
    orderFailed: "Could not save calculator order.",
    reset: "Restore defaults",
    resetFailed: "Could not restore calculator defaults.",
    visible: "Shown to you",
    hidden: "Hidden from you",
    orderTitle: "Your order",
    orderDescription: "Move calculators up or down. This order is used on the calculator home page and helps shape a more personal workspace.",
    moveUp: "Move up",
    moveDown: "Move down",
    calculatorDescriptions: {
      pca: "Patient-controlled analgesia dose planning with support for your personal drug library.",
      peds: "Pediatric dose calculator with personal indication presets and drug-library defaults.",
      vte: "Deep vein thrombosis probability support in a standalone Wells-style calculator.",
      pe: "Pulmonary embolism probability support in a standalone Wells-style calculator.",
      cad: "Pre-test coronary artery disease probability support in a standalone structured calculator.",
      chads: "Atrial fibrillation stroke and bleeding risk support in a standalone dual-score calculator.",
      bmi: "Body mass index calculator.",
      gfr: "Cockcroft-Gault style renal function estimate.",
      abg: "Structured acid-base and blood-gas interpretation with compensation, anion gap, oxygenation, and DKA checks.",
    },
  },
} as const;

export default function CalculatorVisibilitySettingsCard() {
  const { language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const i18n = texts[lang];
  const [calculators, setCalculators] = useState<CalculatorVisibilityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
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

  const persistOrder = async (nextCalculators: CalculatorVisibilityItem[]) => {
    setIsReordering(true);
    setStatus("");

    try {
      const response = await fetch("/api/calculators/visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedKeys: nextCalculators.map((calculator) => calculator.key) }),
      });

      if (!response.ok) throw new Error(i18n.orderFailed);

      const data = await response.json();
      setCalculators(Array.isArray(data.calculators) ? data.calculators : nextCalculators);
    } catch (error) {
      console.error(error);
      setStatus(i18n.orderFailed);
      await loadVisibility();
    } finally {
      setIsReordering(false);
    }
  };

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

  const moveCalculator = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= calculators.length || isReordering) return;

    const nextCalculators = [...calculators];
    const [movedItem] = nextCalculators.splice(index, 1);
    nextCalculators.splice(targetIndex, 0, movedItem);
    setCalculators(nextCalculators);
    await persistOrder(nextCalculators);
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
          <p className="text-xs text-slate-400 mt-2 max-w-3xl">{i18n.orderDescription}</p>
        </div>
        <button
          onClick={resetDefaults}
          disabled={isResetting || isLoading || isReordering}
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
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{i18n.orderTitle}</div>
            {isReordering && (
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                <Loader2 size={12} className="animate-spin" />
                {i18n.loading}
              </div>
            )}
          </div>
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
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                      {i18n.calculatorDescriptions[calculator.key as keyof typeof i18n.calculatorDescriptions] || calculator.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <div className={`text-[10px] font-bold uppercase ${calculator.isVisible ? "text-emerald-600" : "text-slate-400"}`}>
                        {calculator.isVisible ? i18n.visible : i18n.hidden}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveCalculator(calculators.findIndex((item) => item.key === calculator.key), -1)}
                      disabled={isReordering || calculators[0]?.key === calculator.key}
                      aria-label={i18n.moveUp}
                      title={i18n.moveUp}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCalculator(calculators.findIndex((item) => item.key === calculator.key), 1)}
                      disabled={isReordering || calculators[calculators.length - 1]?.key === calculator.key}
                      aria-label={i18n.moveDown}
                      title={i18n.moveDown}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={calculator.isVisible}
                      disabled={isUpdating || isReordering}
                      onChange={(event) => setCalculatorVisibility(calculator.key, event.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {status && <div className="text-xs text-red-500">{status}</div>}
    </div>
  );
}
