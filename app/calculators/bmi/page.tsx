"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Copy, Scale } from "lucide-react";
import { useI18n } from "../../../lib/useI18n";
import { calculateBmi, classifyBmi } from "../../../lib/calculators/modules/bmi/formulas";

type UiLang = "fi" | "ru" | "en";

const texts = {
  fi: {
    back: "← Takaisin laskureihin",
    title: "BMI-laskuri",
    description: "Yksinkertainen painoindeksin laskuri. Tulos on tarkoitettu kliinisen arvion tueksi, ei yksinään päätöksenteon perustaksi.",
    height: "Pituus (cm)",
    weight: "Paino (kg)",
    result: "Painoindeksi",
    copy: "Kopioi",
    copied: "Kopioitu",
    enter: "Syötä tiedot",
    disclaimer: "Tarkista tulos aina potilaan kokonaisarvion, kehonkoostumuksen ja kliinisen tilanteen mukaan.",
    classes: {
      underweight: "Alipaino",
      normal: "Normaalipaino",
      overweight: "Ylipaino",
      obesity1: "Lihavuus, luokka I",
      obesity2: "Lihavuus, luokka II",
      obesity3: "Lihavuus, luokka III",
    },
  },
  ru: {
    back: "← Назад к калькуляторам",
    title: "BMI-калькулятор",
    description: "Простой расчёт индекса массы тела. Результат предназначен только как поддержка клинической оценки, а не как единственное основание для решений.",
    height: "Рост (cm)",
    weight: "Вес (kg)",
    result: "Индекс массы тела",
    copy: "Копировать",
    copied: "Скопировано",
    enter: "Введите данные",
    disclaimer: "Всегда оценивайте результат с учётом общего клинического контекста, состава тела и состояния пациента.",
    classes: {
      underweight: "Недостаточная масса",
      normal: "Нормальная масса",
      overweight: "Избыточная масса",
      obesity1: "Ожирение, класс I",
      obesity2: "Ожирение, класс II",
      obesity3: "Ожирение, класс III",
    },
  },
  en: {
    back: "← Back to calculators",
    title: "BMI calculator",
    description: "Simple body mass index calculator. The result is intended as clinical support, not as a standalone decision tool.",
    height: "Height (cm)",
    weight: "Weight (kg)",
    result: "Body mass index",
    copy: "Copy",
    copied: "Copied",
    enter: "Enter values",
    disclaimer: "Always interpret the result in the context of overall clinical assessment, body composition, and the patient situation.",
    classes: {
      underweight: "Underweight",
      normal: "Normal weight",
      overweight: "Overweight",
      obesity1: "Obesity, class I",
      obesity2: "Obesity, class II",
      obesity3: "Obesity, class III",
    },
  },
} as const;

function fmt(value: number) {
  return value.toFixed(1).replace(".", ",");
}

export default function BmiCalculatorPage() {
  const { language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const i18n = texts[lang];
  const [height, setHeight] = useState("175");
  const [weight, setWeight] = useState("75");
  const [copied, setCopied] = useState(false);

  const bmi = useMemo(() => calculateBmi(Number(height), Number(weight)), [height, weight]);
  const bmiClass = bmi ? classifyBmi(bmi) : null;

  const copyText = async () => {
    if (!bmi || !bmiClass) return;

    const text = [
      "BMI",
      `${i18n.height}: ${height}`,
      `${i18n.weight}: ${weight}`,
      `${i18n.result}: ${fmt(bmi)}`,
      `${i18n.classes[bmiClass]}`,
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
          <Activity className="text-blue-600" size={26} /> {i18n.title}
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">{i18n.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">{i18n.height}</label>
            <input
              type="number"
              value={height}
              onChange={(event) => setHeight(event.target.value)}
              className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-black text-lg outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">{i18n.weight}</label>
            <input
              type="number"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-black text-lg outline-none"
            />
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
              disabled={!bmi}
              className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 disabled:opacity-30 transition-all"
            >
              <Copy size={14} /> {copied ? i18n.copied : i18n.copy}
            </button>
          </div>

          {!bmi || !bmiClass ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-200 font-black uppercase text-center">
              <Scale size={64} className="mb-4 opacity-20" />
              <div className="text-4xl tracking-tighter">{i18n.enter}</div>
            </div>
          ) : (
            <div className="flex-1 space-y-5">
              <div className="text-center bg-slate-50 p-12 rounded-[3rem] border border-slate-100">
                <Scale className="mx-auto mb-4 text-blue-600" size={48} />
                <div className="text-8xl font-black text-blue-600 mb-3">{fmt(bmi)}</div>
                <p className="px-6 py-2 bg-blue-600 text-white inline-block rounded-full text-[10px] font-black uppercase tracking-widest">
                  {i18n.classes[bmiClass]}
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
