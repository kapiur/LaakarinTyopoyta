"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, Copy, Droplets } from "lucide-react";
import { useI18n } from "../../../lib/useI18n";
import { calculateCockcroftGault, classifyGfr, type CockcroftGaultSex } from "../../../lib/calculators/modules/gfr/formulas";

type UiLang = "fi" | "ru" | "en";

const texts = {
  fi: {
    back: "← Takaisin laskureihin",
    title: "GFR-laskuri",
    description: "Cockcroft-Gault -tyyppinen kreatiniinipohjainen arvio. Käytä kliinistä harkintaa erityisesti poikkeavassa kehonkoostumuksessa ja epätyypillisissä tilanteissa.",
    age: "Ikä",
    weight: "Paino (kg)",
    creatinine: "Kreatiniini (µmol/l)",
    sex: "Sukupuoli",
    male: "Mies",
    female: "Nainen",
    result: "Arvioitu puhdistuma",
    unit: "ml/min",
    copy: "Kopioi",
    copied: "Kopioitu",
    enter: "Syötä tiedot",
    disclaimer: "Arvio ei korvaa kliinistä kokonaisarviota. Tarkista lääkedosointi paikallisten ohjeiden ja potilaan tilanteen mukaan.",
    classes: {
      normal: "Lähes normaali",
      mild: "Lievä alenema",
      mildModerate: "Lievä–kohtalainen alenema",
      moderateSevere: "Kohtalainen–vaikea alenema",
      severe: "Vaikea alenema",
      kidneyFailure: "Munuaisten vajaatoiminta",
    },
  },
  ru: {
    back: "← Назад к калькуляторам",
    title: "GFR-калькулятор",
    description: "Оценка по типу Cockcroft-Gault на основе креатинина. Используйте клиническую оценку особенно при необычном составе тела и нетипичных ситуациях.",
    age: "Возраст",
    weight: "Вес (kg)",
    creatinine: "Креатинин (µmol/l)",
    sex: "Пол",
    male: "Мужчина",
    female: "Женщина",
    result: "Оценочный клиренс",
    unit: "ml/min",
    copy: "Копировать",
    copied: "Скопировано",
    enter: "Введите данные",
    disclaimer: "Оценка не заменяет клиническую интерпретацию. Проверяйте дозировку по локальным рекомендациям и ситуации пациента.",
    classes: {
      normal: "Почти норма",
      mild: "Лёгкое снижение",
      mildModerate: "Лёгкое–умеренное снижение",
      moderateSevere: "Умеренное–тяжёлое снижение",
      severe: "Тяжёлое снижение",
      kidneyFailure: "Почечная недостаточность",
    },
  },
  en: {
    back: "← Back to calculators",
    title: "GFR calculator",
    description: "Cockcroft-Gault style creatinine-based estimate. Use clinical judgement, especially in unusual body composition and atypical cases.",
    age: "Age",
    weight: "Weight (kg)",
    creatinine: "Creatinine (µmol/l)",
    sex: "Sex",
    male: "Male",
    female: "Female",
    result: "Estimated clearance",
    unit: "ml/min",
    copy: "Copy",
    copied: "Copied",
    enter: "Enter values",
    disclaimer: "This estimate does not replace clinical interpretation. Check medication dosing against local guidance and the patient context.",
    classes: {
      normal: "Near normal",
      mild: "Mild reduction",
      mildModerate: "Mild to moderate reduction",
      moderateSevere: "Moderate to severe reduction",
      severe: "Severe reduction",
      kidneyFailure: "Kidney failure",
    },
  },
} as const;

function fmt(value: number, digits = 0) {
  return value.toFixed(digits).replace(".", ",");
}

export default function GfrCalculatorPage() {
  const { language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const i18n = texts[lang];
  const [age, setAge] = useState("65");
  const [weight, setWeight] = useState("75");
  const [creatinine, setCreatinine] = useState("100");
  const [sex, setSex] = useState<CockcroftGaultSex>("male");
  const [copied, setCopied] = useState(false);

  const gfr = useMemo(
    () => calculateCockcroftGault(Number(age), Number(weight), Number(creatinine), sex),
    [age, weight, creatinine, sex]
  );
  const gfrClass = gfr ? classifyGfr(gfr) : null;

  const copyText = async () => {
    if (!gfr || !gfrClass) return;

    const text = [
      "Cockcroft-Gault",
      `${i18n.age}: ${age}`,
      `${i18n.weight}: ${weight}`,
      `${i18n.creatinine}: ${creatinine}`,
      `${i18n.sex}: ${sex === "male" ? i18n.male : i18n.female}`,
      `${i18n.result}: ${fmt(gfr)} ${i18n.unit}`,
      `${i18n.classes[gfrClass]}`,
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-5 pb-10 text-slate-900 p-2 sm:p-4">
      <div>
        <Link href="/calculators" className="text-xs font-bold text-blue-600 hover:text-blue-700">
          {i18n.back}
        </Link>
        <h1 className="mt-2 text-2xl font-black text-slate-800 flex items-center gap-2">
          <Calculator className="text-blue-600" size={26} /> {i18n.title}
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">{i18n.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">{i18n.age}</label>
              <input
                type="number"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">{i18n.weight}</label>
              <input
                type="number"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">{i18n.creatinine}</label>
            <input
              type="number"
              value={creatinine}
              onChange={(event) => setCreatinine(event.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">{i18n.sex}</label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                onClick={() => setSex("male")}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${sex === "male" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}
              >
                {i18n.male}
              </button>
              <button
                onClick={() => setSex("female")}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${sex === "female" ? "bg-white shadow-sm text-pink-600" : "text-slate-500"}`}
              >
                {i18n.female}
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-200 shadow-sm min-h-[420px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-[12px] font-black text-blue-600 uppercase tracking-[0.2em]">{i18n.result}</span>
            </div>
            <button
              onClick={copyText}
              disabled={!gfr}
              className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 disabled:opacity-30 transition-all"
            >
              <Copy size={14} /> {copied ? i18n.copied : i18n.copy}
            </button>
          </div>

          {!gfr || !gfrClass ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-200 font-black uppercase text-center">
              <Droplets size={64} className="mb-4 opacity-20" />
              <div className="text-4xl tracking-tighter">{i18n.enter}</div>
            </div>
          ) : (
            <div className="flex-1 space-y-5">
              <div className="text-center bg-slate-50 p-12 rounded-[3rem] border border-slate-100">
                <Droplets className="mx-auto mb-4 text-blue-600" size={48} />
                <div className="text-8xl font-black text-blue-600 mb-3">{fmt(gfr)}</div>
                <div className="text-sm font-bold text-slate-400 mb-3">{i18n.unit}</div>
                <p className="px-6 py-2 bg-blue-600 text-white inline-block rounded-full text-[10px] font-black uppercase tracking-widest">
                  {i18n.classes[gfrClass]}
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 p-5 bg-blue-50 rounded-[1.5rem] border border-blue-100 flex gap-4 items-center">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[12px] font-black italic shadow-md shadow-blue-200">i</div>
            <p className="text-[10px] text-blue-800 leading-tight font-bold italic">{i18n.disclaimer}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
