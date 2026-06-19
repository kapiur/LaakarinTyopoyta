"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Calculator, Copy, Droplets, MessageSquareShare } from "lucide-react";
import { calculateCockcroftGault, classifyGfr, type CockcroftGaultSex } from "../../lib/calculators/modules/gfr/formulas";
import { useI18n } from "../../lib/useI18n";

type UiLang = "fi" | "ru" | "en" | "de";

const text = {
  fi: {
    back: "Takaisin laskureihin", title: "GFR-laskuri", description: "Cockcroft-Gault-tyyppinen arvioitu kreatiniinipuhdistuma.",
    age: "Ikä", weight: "Paino (kg)", creatinine: "Kreatiniini (µmol/l)", sex: "Sukupuoli", male: "Mies", female: "Nainen",
    result: "Arvioitu puhdistuma", unit: "ml/min", copy: "Kopioi", copied: "Kopioitu", discuss: "Keskustele laskelmasta AI:n kanssa",
    disclaimer: "Tarkista lääkedosointi paikallisten ohjeiden, kehonkoostumuksen ja kliinisen tilanteen mukaan.",
    classes: { normal: "Lähes normaali", mild: "Lievä alenema", mildModerate: "Lievä–kohtalainen alenema", moderateSevere: "Kohtalainen–vaikea alenema", severe: "Vaikea alenema", kidneyFailure: "Munuaisten vajaatoiminta" },
  },
  ru: {
    back: "Назад к калькуляторам", title: "GFR-калькулятор", description: "Оценочный клиренс креатинина по типу Cockcroft–Gault.",
    age: "Возраст", weight: "Вес (кг)", creatinine: "Креатинин (мкмоль/л)", sex: "Пол", male: "Мужчина", female: "Женщина",
    result: "Оценочный клиренс", unit: "мл/мин", copy: "Копировать", copied: "Скопировано", discuss: "Обсудить расчёт с AI",
    disclaimer: "Проверяйте дозирование по локальным рекомендациям с учётом состава тела и клинической ситуации.",
    classes: { normal: "Почти норма", mild: "Лёгкое снижение", mildModerate: "Лёгкое–умеренное снижение", moderateSevere: "Умеренное–тяжёлое снижение", severe: "Тяжёлое снижение", kidneyFailure: "Почечная недостаточность" },
  },
  en: {
    back: "Back to calculators", title: "GFR calculator", description: "Cockcroft–Gault style estimated creatinine clearance.",
    age: "Age", weight: "Weight (kg)", creatinine: "Creatinine (µmol/l)", sex: "Sex", male: "Male", female: "Female",
    result: "Estimated clearance", unit: "ml/min", copy: "Copy", copied: "Copied", discuss: "Discuss calculation with AI",
    disclaimer: "Check medication dosing against local guidance, body composition, and the clinical situation.",
    classes: { normal: "Near normal", mild: "Mild reduction", mildModerate: "Mild to moderate reduction", moderateSevere: "Moderate to severe reduction", severe: "Severe reduction", kidneyFailure: "Kidney failure" },
  },
  de: {
    back: "Zurück zu den Rechnern", title: "GFR-Rechner", description: "Geschätzte Kreatinin-Clearance nach Cockcroft–Gault.",
    age: "Alter", weight: "Gewicht (kg)", creatinine: "Kreatinin (µmol/l)", sex: "Geschlecht", male: "Männlich", female: "Weiblich",
    result: "Geschätzte Clearance", unit: "ml/min", copy: "Kopieren", copied: "Kopiert", discuss: "Berechnung mit AI besprechen",
    disclaimer: "Dosierung anhand lokaler Leitlinien, Körperzusammensetzung und klinischer Situation prüfen.",
    classes: { normal: "Nahezu normal", mild: "Leicht vermindert", mildModerate: "Leicht bis mäßig vermindert", moderateSevere: "Mäßig bis stark vermindert", severe: "Stark vermindert", kidneyFailure: "Nierenversagen" },
  },
} as const;

export default function GfrCalculator({
  embedded = false,
  onDiscussResult,
}: {
  embedded?: boolean;
  onDiscussResult?: (content: string) => void;
}) {
  const { language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en", "de"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const copy = text[lang];
  const [age, setAge] = useState("65");
  const [weight, setWeight] = useState("75");
  const [creatinine, setCreatinine] = useState("100");
  const [sex, setSex] = useState<CockcroftGaultSex>("male");
  const [copied, setCopied] = useState(false);
  const gfr = useMemo(() => calculateCockcroftGault(Number(age), Number(weight), Number(creatinine), sex), [age, weight, creatinine, sex]);
  const gfrClass = gfr ? classifyGfr(gfr) : null;
  const format = (value: number) => new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(value);
  const resultText = gfr && gfrClass
    ? ["Cockcroft–Gault", `${copy.result}: ${format(gfr)} ${copy.unit}`, `${copy.age}: ${age}`, `${copy.weight}: ${weight}`, `${copy.creatinine}: ${creatinine}`, `${copy.sex}: ${sex === "male" ? copy.male : copy.female}`, copy.classes[gfrClass]].join("\n")
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
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-slate-900"><Calculator size={24} className="text-blue-600" />{copy.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{copy.description}</p>
        </header>
      )}

      <div className={`grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] ${embedded ? "" : "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"}`}>
        <section className="space-y-4 p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-600">{copy.age}<input type="number" min="1" max="139" value={age} onChange={(event) => setAge(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-bold outline-none focus:border-blue-400 focus:bg-white" /></label>
            <label className="text-xs font-bold text-slate-600">{copy.weight}<input type="number" min="1" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-bold outline-none focus:border-blue-400 focus:bg-white" /></label>
          </div>
          <label className="block text-xs font-bold text-slate-600">{copy.creatinine}<input type="number" min="1" value={creatinine} onChange={(event) => setCreatinine(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-bold outline-none focus:border-blue-400 focus:bg-white" /></label>
          <fieldset><legend className="mb-2 text-xs font-bold text-slate-600">{copy.sex}</legend><div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"><button type="button" onClick={() => setSex("male")} className={`h-10 rounded-md text-xs font-bold ${sex === "male" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>{copy.male}</button><button type="button" onClick={() => setSex("female")} className={`h-10 rounded-md text-xs font-bold ${sex === "female" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>{copy.female}</button></div></fieldset>
        </section>

        <section className="flex min-h-72 flex-col justify-between border-t border-slate-200 bg-slate-50 p-5 md:border-l md:border-t-0 sm:p-6">
          <div>
            <div className="flex items-center justify-between gap-3"><span className="text-xs font-black uppercase text-slate-500">{copy.result}</span><button type="button" onClick={copyResult} disabled={!resultText} className="flex items-center gap-1.5 rounded-md p-2 text-xs font-bold text-slate-400 hover:bg-white hover:text-blue-700 disabled:opacity-30"><Copy size={14} />{copied ? copy.copied : copy.copy}</button></div>
            {gfr && gfrClass ? <div className="mt-6 flex items-center gap-5"><Droplets size={38} className="shrink-0 text-blue-600" /><div><div className="flex items-end gap-2"><span className="text-5xl font-black text-blue-700">{format(gfr)}</span><span className="pb-1 text-sm font-bold text-slate-400">{copy.unit}</span></div><div className="mt-1 text-sm font-bold text-slate-600">{copy.classes[gfrClass]}</div></div></div> : null}
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-slate-200 pt-4"><p className="max-w-md text-[11px] leading-relaxed text-slate-500">{copy.disclaimer}</p>{onDiscussResult && <button type="button" onClick={() => resultText && onDiscussResult(resultText)} disabled={!resultText} className="flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-40"><MessageSquareShare size={14} />{copy.discuss}</button>}</div>
        </section>
      </div>
    </div>
  );
}
