"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Baby, Calculator, Heart, Loader2, Settings2, ShieldAlert, Stethoscope, Wind, Zap } from "lucide-react";
import { useI18n } from "../../lib/useI18n";

type UiLang = "fi" | "ru" | "en";

type CalculatorCard = {
  key: string;
  title: string;
  description: string;
  route: string;
  icon: "Zap" | "Baby" | "ShieldAlert" | "Wind" | "Stethoscope" | "Heart" | "Activity" | "Calculator";
  category: "analgesia" | "pediatrics" | "thrombosis" | "cardiology" | "general";
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
    description: "Valitse omaan työhön sopivat laskurit asetuksista. Tämä näkymä näyttää vain sinulle näkyviksi valitut laskurit.",
    loading: "Ladataan laskureita...",
    loadFailed: "Laskureiden lataus epäonnistui.",
    manage: "Hallitse näkyvyyttä",
    emptyTitle: "Ei näkyviä laskureita",
    emptyDescription: "Ota laskureita käyttöön asetuksista, niin ne tulevat näkyviin tähän näkymään.",
    open: "Avaa laskuri",
    categories: {
      analgesia: "Analgesia",
      pediatrics: "Annoslaskenta",
      thrombosis: "Tromboosi",
      cardiology: "Kardiologia",
      general: "Yleiset",
    },
    calculatorDescriptions: {
      pca: "PCA-annostelun suunnittelu käyttäjän oman lääkevalikoiman tuella.",
      peds: "Painoperusteinen annoslaskuri käyttäjäkohtaisilla indikaatioilla ja lääkevalikoiman oletuksilla.",
      vte: "Syvän laskimotromboosin todennäköisyyden arvio erillisellä Wells-tyylisellä laskurilla.",
      pe: "Keuhkoembolian todennäköisyyden arvio erillisellä Wells-tyylisellä laskurilla.",
      cad: "Sepelvaltimotaudin esitodennäköisyyden arvio erillisessä rakenteisessa näkymässä.",
      chads: "Eteisvärinäpotilaan aivohalvaus- ja vuotoriskin arvio kaksoislaskurissa.",
      bmi: "Painoindeksin laskuri.",
      gfr: "Munuaistoiminnan arvio Cockcroft-Gault-tyylisellä kaavalla.",
      abg: "Happo-emästasapainon ja verikaasujen jäsennelty tulkinta kompensaation, AG:n, hapetuksen ja DKA-seulan kanssa.",
    },
  },
  ru: {
    title: "Калькуляторы",
    description: "Выбирайте нужные вам калькуляторы в настройках. Здесь показываются только те, которые вы оставили видимыми для себя.",
    loading: "Загрузка калькуляторов...",
    loadFailed: "Не удалось загрузить калькуляторы.",
    manage: "Управлять видимостью",
    emptyTitle: "Нет видимых калькуляторов",
    emptyDescription: "Включите калькуляторы в настройках, и они появятся на этой странице.",
    open: "Открыть калькулятор",
    categories: {
      analgesia: "Аналгезия",
      pediatrics: "Дозировки",
      thrombosis: "Тромбоз",
      cardiology: "Кардиология",
      general: "Общие",
    },
    calculatorDescriptions: {
      pca: "Планирование дозировок PCA с поддержкой вашей пользовательской библиотеки препаратов.",
      peds: "Калькулятор дозировок по весу с пользовательскими показаниями и настройками библиотеки препаратов.",
      vte: "Оценка вероятности тромбоза глубоких вен по отдельному калькулятору в стиле Wells.",
      pe: "Оценка вероятности ТЭЛА по отдельному калькулятору в стиле Wells.",
      cad: "Оценка предтестовой вероятности ишемической болезни сердца в отдельной структурированной форме.",
      chads: "Оценка риска инсульта и кровотечения при фибрилляции предсердий в двойном калькуляторе.",
      bmi: "Калькулятор индекса массы тела.",
      gfr: "Оценка функции почек по формуле в стиле Cockcroft-Gault.",
      abg: "Структурированная интерпретация КОС и газов крови с расчетом компенсации, AG, оксигенации и проверкой на ДКА.",
    },
  },
  en: {
    title: "Calculators",
    description: "Choose the calculators you need in settings. This page shows only the calculators that are visible to you.",
    loading: "Loading calculators...",
    loadFailed: "Could not load calculators.",
    manage: "Manage visibility",
    emptyTitle: "No visible calculators",
    emptyDescription: "Enable calculators in settings and they will appear here.",
    open: "Open calculator",
    categories: {
      analgesia: "Analgesia",
      pediatrics: "Dosing",
      thrombosis: "Thrombosis",
      cardiology: "Cardiology",
      general: "General",
    },
    calculatorDescriptions: {
      pca: "Patient-controlled analgesia dose planning with support for your personal drug library.",
      peds: "Weight-based dose calculator with personal indication presets and drug-library defaults.",
      vte: "Deep vein thrombosis probability support in a standalone Wells-style calculator.",
      pe: "Pulmonary embolism probability support in a standalone Wells-style calculator.",
      cad: "Pre-test coronary artery disease probability support in a standalone structured view.",
      chads: "Atrial fibrillation stroke and bleeding risk support in a standalone dual-score view.",
      bmi: "Body mass index calculator.",
      gfr: "Cockcroft-Gault style renal function estimate.",
      abg: "Structured acid-base and blood-gas interpretation with compensation, anion gap, oxygenation, and DKA checks.",
    },
  },
} as const;

export default function CalculatorsCatalogPage() {
  const { language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const i18n = texts[lang];
  const [calculators, setCalculators] = useState<CalculatorCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCalculators() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/calculators/visibility");
        if (!response.ok) throw new Error(i18n.loadFailed);
        const data = await response.json();
        if (isMounted) {
          setCalculators(Array.isArray(data.calculators) ? data.calculators : []);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setError(i18n.loadFailed);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadCalculators();
    return () => {
      isMounted = false;
    };
  }, [i18n.loadFailed]);

  const visibleCalculators = useMemo(
    () => calculators.filter((calculator) => calculator.isVisible),
    [calculators]
  );

  const groupedCalculators = useMemo(() => {
    return visibleCalculators.reduce<Record<string, CalculatorCard[]>>((groups, calculator) => {
      if (!groups[calculator.category]) groups[calculator.category] = [];
      groups[calculator.category].push(calculator);
      return groups;
    }, {});
  }, [visibleCalculators]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-5 pb-10 text-slate-900 p-2 sm:p-4">
      <header className="bg-white border border-slate-200 rounded-[2rem] p-6 sm:p-8 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{i18n.title}</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-3xl">{i18n.description}</p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-blue-600 hover:bg-blue-50"
        >
          <Settings2 size={16} />
          {i18n.manage}
        </Link>
      </header>

      {isLoading ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500 flex items-center gap-3">
          <Loader2 size={18} className="animate-spin" />
          {i18n.loading}
        </div>
      ) : error ? (
        <div className="rounded-[2rem] border border-red-100 bg-red-50 p-6 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : visibleCalculators.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="text-xl font-black text-slate-700">{i18n.emptyTitle}</div>
          <p className="mt-2 text-sm font-semibold text-slate-400">{i18n.emptyDescription}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedCalculators).map(([category, items]) => (
            <section key={category} className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400 px-1">
                {i18n.categories[category as keyof typeof i18n.categories]}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((calculator) => {
                  const Icon = iconMap[calculator.icon] ?? Calculator;

                  return (
                    <Link
                      key={calculator.key}
                      href={calculator.route}
                      className="group rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                          <Icon size={22} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-lg font-black text-slate-900">{calculator.title}</div>
                          <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                            {i18n.calculatorDescriptions[calculator.key as keyof typeof i18n.calculatorDescriptions] || calculator.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
                        {i18n.open}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
