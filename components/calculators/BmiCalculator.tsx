"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Activity, Copy, MessageSquareShare, Scale } from "lucide-react";
import { calculateBmi, classifyBmi } from "../../lib/calculators/modules/bmi/formulas";
import { useI18n } from "../../lib/useI18n";

type UiLang = "fi" | "ru" | "en" | "de";

const text = {
  fi: {
    back: "Takaisin laskureihin", title: "BMI-laskuri", description: "Painoindeksi kliinisen arvion tueksi.",
    height: "Pituus (cm)", weight: "Paino (kg)", result: "Painoindeksi", copy: "Kopioi", copied: "Kopioitu",
    discuss: "Keskustele laskelmasta AI:n kanssa", disclaimer: "Tulkinta edellyttää kehonkoostumuksen ja kliinisen tilanteen huomioimista.",
    classes: { underweight: "Alipaino", normal: "Normaalipaino", overweight: "Ylipaino", obesity1: "Lihavuus, luokka I", obesity2: "Lihavuus, luokka II", obesity3: "Lihavuus, luokka III" },
  },
  ru: {
    back: "Назад к калькуляторам", title: "BMI-калькулятор", description: "Индекс массы тела для поддержки клинической оценки.",
    height: "Рост (см)", weight: "Вес (кг)", result: "Индекс массы тела", copy: "Копировать", copied: "Скопировано",
    discuss: "Обсудить расчёт с AI", disclaimer: "Интерпретируйте результат с учётом состава тела и клинической ситуации.",
    classes: { underweight: "Недостаточная масса", normal: "Нормальная масса", overweight: "Избыточная масса", obesity1: "Ожирение, класс I", obesity2: "Ожирение, класс II", obesity3: "Ожирение, класс III" },
  },
  en: {
    back: "Back to calculators", title: "BMI calculator", description: "Body mass index for clinical assessment support.",
    height: "Height (cm)", weight: "Weight (kg)", result: "Body mass index", copy: "Copy", copied: "Copied",
    discuss: "Discuss calculation with AI", disclaimer: "Interpret the result in the context of body composition and the clinical situation.",
    classes: { underweight: "Underweight", normal: "Normal weight", overweight: "Overweight", obesity1: "Obesity, class I", obesity2: "Obesity, class II", obesity3: "Obesity, class III" },
  },
  de: {
    back: "Zurück zu den Rechnern", title: "BMI-Rechner", description: "Body-Mass-Index zur Unterstützung der klinischen Beurteilung.",
    height: "Größe (cm)", weight: "Gewicht (kg)", result: "Body-Mass-Index", copy: "Kopieren", copied: "Kopiert",
    discuss: "Berechnung mit AI besprechen", disclaimer: "Das Ergebnis im Kontext von Körperzusammensetzung und klinischer Situation beurteilen.",
    classes: { underweight: "Untergewicht", normal: "Normalgewicht", overweight: "Übergewicht", obesity1: "Adipositas Grad I", obesity2: "Adipositas Grad II", obesity3: "Adipositas Grad III" },
  },
} as const;

export default function BmiCalculator({
  embedded = false,
  onDiscussResult,
}: {
  embedded?: boolean;
  onDiscussResult?: (content: string) => void;
}) {
  const { language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en", "de"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const copy = text[lang];
  const [height, setHeight] = useState("175");
  const [weight, setWeight] = useState("75");
  const [copied, setCopied] = useState(false);
  const bmi = useMemo(() => calculateBmi(Number(height), Number(weight)), [height, weight]);
  const bmiClass = bmi ? classifyBmi(bmi) : null;
  const format = (value: number) => new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
  const resultText = bmi && bmiClass
    ? [`BMI: ${format(bmi)}`, `${copy.height}: ${height}`, `${copy.weight}: ${weight}`, copy.classes[bmiClass]].join("\n")
    : "";

  async function copyResult() {
    if (!resultText) return;
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className={embedded ? "" : "mx-auto max-w-5xl space-y-4 p-2 pb-10 sm:p-4"}>
      {!embedded && (
        <header>
          <Link href="/calculators" className="text-xs font-bold text-blue-600 hover:text-blue-800">{copy.back}</Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-slate-900"><Activity size={24} className="text-blue-600" />{copy.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{copy.description}</p>
        </header>
      )}

      <div className={`grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] ${embedded ? "" : "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"}`}>
        <section className="space-y-4 p-5 sm:p-6">
          <label className="block text-xs font-bold text-slate-600">
            {copy.height}
            <input type="number" min="1" value={height} onChange={(event) => setHeight(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-blue-400 focus:bg-white" />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            {copy.weight}
            <input type="number" min="1" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-blue-400 focus:bg-white" />
          </label>
        </section>

        <section className="flex min-h-64 flex-col justify-between border-t border-slate-200 bg-slate-50 p-5 md:border-l md:border-t-0 sm:p-6">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase text-slate-500">{copy.result}</span>
              <button type="button" onClick={copyResult} disabled={!resultText} className="flex items-center gap-1.5 rounded-md p-2 text-xs font-bold text-slate-400 hover:bg-white hover:text-blue-700 disabled:opacity-30"><Copy size={14} />{copied ? copy.copied : copy.copy}</button>
            </div>
            {bmi && bmiClass ? (
              <div className="mt-6 flex items-center gap-5">
                <Scale size={38} className="shrink-0 text-blue-600" />
                <div><div className="text-5xl font-black text-blue-700">{format(bmi)}</div><div className="mt-1 text-sm font-bold text-slate-600">{copy.classes[bmiClass]}</div></div>
              </div>
            ) : null}
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="max-w-md text-[11px] leading-relaxed text-slate-500">{copy.disclaimer}</p>
            {onDiscussResult && <button type="button" onClick={() => resultText && onDiscussResult(resultText)} disabled={!resultText} className="flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-40"><MessageSquareShare size={14} />{copy.discuss}</button>}
          </div>
        </section>
      </div>
    </div>
  );
}
