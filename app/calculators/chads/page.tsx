"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Heart } from "lucide-react";
import { useI18n } from "../../../lib/useI18n";
import {
  assessChadsVascRisk,
  assessHasBledRisk,
  calculateChadsVascScore,
  calculateHasBledScore,
  type ChadsState,
  type HasBledState,
} from "../../../lib/calculators/modules/chads/formulas";

type UiLang = "fi" | "ru" | "en";

const chadsDefaults: ChadsState = {
  chf: false,
  hypertension: false,
  age75Plus: false,
  age65to74: false,
  diabetes: false,
  strokeOrTia: false,
  vascularDisease: false,
  femaleSex: false,
};

const hasBledDefaults: HasBledState = {
  systolicBpOver160: false,
  renal: false,
  liver: false,
  stroke: false,
  priorBleeding: false,
  labileInr: false,
  ageOver65: false,
  drugs: false,
  alcohol: false,
};

const texts = {
  fi: {
    back: "← Takaisin laskureihin",
    title: "CHADS / HAS-BLED",
    description: "Eteisvärinäpotilaan aivoinfarkti- ja vuotoriskin tuki. Pidä tulos päätöksenteon apuna, ei yksinään ratkaisuna.",
    copy: "Kopioi",
    copied: "Kopioitu",
    chadsTitle: "CHA2DS2-VASc",
    hasBledTitle: "HAS-BLED",
    strokeRisk: "Aivoinfarktiriski",
    bleedingRisk: "Vuotoriski",
    annualRisk: "vuodessa",
    disclaimer: "Tarkista aina antikoagulaation kokonaishyöty, vuotoriskin taustatekijät ja paikalliset hoitosuositukset.",
    riskLabels: {
      low: "Pieni",
      moderate: "Kohtalainen",
      high: "Suuri",
    },
    chadsItems: {
      chf: "Vajaatoiminta",
      hypertension: "Hypertensio",
      age75Plus: "Ikä ≥ 75",
      age65to74: "Ikä 65–74",
      diabetes: "Diabetes",
      strokeOrTia: "TIA / infarkti",
      vascularDisease: "Valtimotauti",
      femaleSex: "Nainen",
    },
    hasBledItems: {
      systolicBpOver160: "RR-syst. > 160",
      renal: "Munuaisten vajaat.",
      liver: "Maksan vajaat.",
      stroke: "Aiempi aivoverenkiertohäiriö",
      priorBleeding: "Aiempi vuoto",
      labileInr: "Labiili INR",
      ageOver65: "Ikä > 65",
      drugs: "Lääkitys",
      alcohol: "Alkoholi",
    },
    summary: "Yhteenveto",
  },
  ru: {
    back: "← Назад к калькуляторам",
    title: "CHADS / HAS-BLED",
    description: "Поддержка оценки риска инсульта и кровотечения при фибрилляции предсердий. Используйте как часть клинического решения, а не как единственный критерий.",
    copy: "Копировать",
    copied: "Скопировано",
    chadsTitle: "CHA2DS2-VASc",
    hasBledTitle: "HAS-BLED",
    strokeRisk: "Риск инсульта",
    bleedingRisk: "Риск кровотечения",
    annualRisk: "в год",
    disclaimer: "Всегда оценивайте суммарную пользу антикоагуляции, модифицируемые факторы кровотечения и локальные рекомендации.",
    riskLabels: {
      low: "Низкий",
      moderate: "Средний",
      high: "Высокий",
    },
    chadsItems: {
      chf: "Сердечная недостаточность",
      hypertension: "Гипертензия",
      age75Plus: "Возраст ≥ 75",
      age65to74: "Возраст 65–74",
      diabetes: "Диабет",
      strokeOrTia: "TIA / инсульт",
      vascularDisease: "Сосудистое заболевание",
      femaleSex: "Женский пол",
    },
    hasBledItems: {
      systolicBpOver160: "САД > 160",
      renal: "Почечная недостаточность",
      liver: "Печеночная недостаточность",
      stroke: "Предыдущий инсульт",
      priorBleeding: "Предыдущее кровотечение",
      labileInr: "Лабильный INR",
      ageOver65: "Возраст > 65",
      drugs: "Лекарства",
      alcohol: "Алкоголь",
    },
    summary: "Итог",
  },
  en: {
    back: "← Back to calculators",
    title: "CHADS / HAS-BLED",
    description: "Support for stroke and bleeding risk in atrial fibrillation. Use the result as part of clinical decision-making, not as a standalone rule.",
    copy: "Copy",
    copied: "Copied",
    chadsTitle: "CHA2DS2-VASc",
    hasBledTitle: "HAS-BLED",
    strokeRisk: "Stroke risk",
    bleedingRisk: "Bleeding risk",
    annualRisk: "per year",
    disclaimer: "Always review the overall anticoagulation benefit, reversible bleeding risk factors, and local guidance.",
    riskLabels: {
      low: "Low",
      moderate: "Moderate",
      high: "High",
    },
    chadsItems: {
      chf: "Heart failure",
      hypertension: "Hypertension",
      age75Plus: "Age ≥ 75",
      age65to74: "Age 65–74",
      diabetes: "Diabetes",
      strokeOrTia: "TIA / stroke",
      vascularDisease: "Vascular disease",
      femaleSex: "Female sex",
    },
    hasBledItems: {
      systolicBpOver160: "Systolic BP > 160",
      renal: "Renal impairment",
      liver: "Liver impairment",
      stroke: "Previous stroke",
      priorBleeding: "Previous bleeding",
      labileInr: "Labile INR",
      ageOver65: "Age > 65",
      drugs: "Drugs",
      alcohol: "Alcohol",
    },
    summary: "Summary",
  },
} as const;

function fmt(value: number) {
  return value.toFixed(1).replace(".", ",");
}

function riskPillClass(level: "low" | "moderate" | "high") {
  if (level === "high") return "bg-red-600 text-white";
  if (level === "moderate") return "bg-amber-500 text-white";
  return "bg-emerald-500 text-white";
}

function hasBledCardClass(level: "low" | "moderate" | "high") {
  if (level === "high") return "bg-red-50 border-red-100";
  if (level === "moderate") return "bg-amber-50 border-amber-100";
  return "bg-slate-50 border-slate-100";
}

export default function ChadsCalculatorPage() {
  const { language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const i18n = texts[lang];
  const [chads, setChads] = useState<ChadsState>(chadsDefaults);
  const [hasBled, setHasBled] = useState<HasBledState>(hasBledDefaults);
  const [copied, setCopied] = useState(false);

  const chadsScore = useMemo(() => calculateChadsVascScore(chads), [chads]);
  const chadsAssessment = useMemo(() => assessChadsVascRisk(chadsScore), [chadsScore]);
  const hasBledScore = useMemo(() => calculateHasBledScore(hasBled), [hasBled]);
  const hasBledAssessment = useMemo(() => assessHasBledRisk(hasBledScore), [hasBledScore]);

  const toggleChads = (key: keyof ChadsState) => {
    setChads((current) => {
      if (key === "age75Plus") {
        return { ...current, age75Plus: !current.age75Plus, age65to74: false };
      }

      if (key === "age65to74") {
        return { ...current, age65to74: !current.age65to74, age75Plus: false };
      }

      return { ...current, [key]: !current[key] };
    });
  };

  const toggleHasBled = (key: keyof HasBledState) => {
    setHasBled((current) => ({ ...current, [key]: !current[key] }));
  };

  const copyText = async () => {
    const lines = [
      "CHA2DS2-VASc / HAS-BLED",
      `CHA2DS2-VASc: ${chadsAssessment.score}`,
      `${i18n.strokeRisk}: ${fmt(chadsAssessment.annualStrokeRiskPercent)}% ${i18n.annualRisk}`,
      `HAS-BLED: ${hasBledAssessment.score}`,
      `${i18n.bleedingRisk}: ${i18n.riskLabels[hasBledAssessment.riskLevel]}`,
    ];

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-5 pb-10 text-slate-900 p-2 sm:p-4">
      <div>
        <Link href="/calculators" className="text-xs font-bold text-blue-600 hover:text-blue-700">
          {i18n.back}
        </Link>
        <h1 className="mt-2 text-2xl font-black text-slate-800 flex items-center gap-2">
          <Heart className="text-blue-600" size={26} /> {i18n.title}
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">{i18n.description}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-3">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">{i18n.chadsTitle}</p>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(chadsDefaults) as Array<keyof ChadsState>).map((key) => (
                <button
                  key={key}
                  onClick={() => toggleChads(key)}
                  className={`p-4 text-left rounded-2xl border text-[12px] font-bold transition-all flex items-center justify-between ${chads[key] ? "bg-blue-600 text-white shadow-md border-blue-600" : "bg-slate-50 border-slate-100 hover:bg-slate-100"}`}
                >
                  <span>{i18n.chadsItems[key]}</span>
                  {chads[key] && <Check size={15} />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{i18n.hasBledTitle}</p>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(hasBledDefaults) as Array<keyof HasBledState>).map((key) => (
                <button
                  key={key}
                  onClick={() => toggleHasBled(key)}
                  className={`p-4 text-left rounded-2xl border text-[12px] font-bold transition-all flex items-center justify-between ${hasBled[key] ? "bg-red-600 text-white shadow-md border-red-600" : "bg-red-50/60 text-red-700 border-red-100 hover:bg-red-50"}`}
                >
                  <span>{i18n.hasBledItems[key]}</span>
                  {hasBled[key] && <Check size={15} />}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-200 shadow-sm min-h-[520px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-[12px] font-black text-blue-600 uppercase tracking-[0.2em]">{i18n.summary}</span>
            </div>
            <button
              onClick={copyText}
              className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-all"
            >
              <Copy size={14} /> {copied ? i18n.copied : i18n.copy}
            </button>
          </div>

          <div className="flex-1 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 text-center shadow-inner">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{i18n.chadsTitle}</p>
                <div className="text-6xl font-black text-blue-600">{chadsAssessment.score}</div>
                <div className="mt-3 text-sm font-bold text-slate-500">
                  {i18n.strokeRisk}: <span className="text-slate-900">{fmt(chadsAssessment.annualStrokeRiskPercent)}%</span>
                </div>
                <div className="text-[10px] font-bold uppercase text-slate-400 mt-1">{i18n.annualRisk}</div>
              </div>

              <div className={`${hasBledCardClass(hasBledAssessment.riskLevel)} p-8 rounded-[2rem] border text-center shadow-inner`}>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{i18n.hasBledTitle}</p>
                <div className={`text-6xl font-black ${hasBledAssessment.riskLevel === "high" ? "text-red-600" : hasBledAssessment.riskLevel === "moderate" ? "text-amber-600" : "text-blue-600"}`}>
                  {hasBledAssessment.score}
                </div>
                <div className="mt-4">
                  <span className={`inline-block rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest ${riskPillClass(hasBledAssessment.riskLevel)}`}>
                    {i18n.riskLabels[hasBledAssessment.riskLevel]}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">{i18n.summary}</div>
              <div className="space-y-2 text-sm font-bold text-slate-700">
                <div>
                  {i18n.strokeRisk}: <span className="text-slate-900">{fmt(chadsAssessment.annualStrokeRiskPercent)}% {i18n.annualRisk}</span>
                </div>
                <div>
                  {i18n.bleedingRisk}: <span className="text-slate-900">{i18n.riskLabels[hasBledAssessment.riskLevel]}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-5 bg-blue-50 rounded-[1.5rem] border border-blue-100 flex gap-4 items-center">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[12px] font-black italic shadow-md shadow-blue-200">i</div>
            <p className="text-[10px] text-blue-800 leading-tight font-bold italic">{i18n.disclaimer}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
