"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, MessageSquareShare, Wind } from "lucide-react";
import { useI18n } from "../../../lib/useI18n";
import { assessPeRisk, calculatePeScore, type PeCriterionKey, type PeCriterionState } from "../../../lib/calculators/modules/pe/formulas";

type UiLang = "fi" | "ru" | "en";

const criteria = [
  { key: "vtesigns", points: 3.0 },
  { key: "altpe", points: 3.0 },
  { key: "hr", points: 1.5 },
  { key: "immobpe", points: 1.5 },
  { key: "prevpe", points: 1.5 },
  { key: "hemopt", points: 1.0 },
  { key: "cancerpe", points: 1.0 },
] as const satisfies Array<{ key: PeCriterionKey; points: number }>;

const texts = {
  fi: {
    back: "← Takaisin laskureihin",
    title: "PE-laskuri",
    description: "Keuhkoembolian todennäköisyyden arvio Wells-tyyppisellä pisteytyksellä. Käytä tulosta kliinisen kokonaisarvion tukena.",
    age: "Potilaan ikä",
    criteriaTitle: "Valitse löydökset",
    result: "PE-riski",
    probability: "Arvioitu todennäköisyys",
    recommendation: "Suositus",
    copy: "Kopioi",
    copied: "Kopioitu",
    discuss: "Keskustele tuloksesta AI:n kanssa",
    disclaimer: "Tulos ei korvaa kliinistä harkintaa tai paikallisia kuvantamis- ja laboratorioprotokollia.",
    risks: {
      low: "Pieni",
      moderate: "Kohtalainen",
      high: "Suuri",
    },
    criteria: {
      vtesigns: "ТГВ oireet",
      altpe: "Muu dg epätodennäköisempi",
      hr: "Syke > 100/min",
      immobpe: "Immobilisaatio / leikkaus",
      prevpe: "Aiempi ТГВ / PE",
      hemopt: "Veriyskä",
      cancerpe: "Aktiivinen syöpä",
    },
  },
  ru: {
    back: "← Назад к калькуляторам",
    title: "PE-калькулятор",
    description: "Оценка вероятности ТЭЛА по шкале типа Wells. Используйте результат как часть общей клинической оценки.",
    age: "Возраст пациента",
    criteriaTitle: "Выберите признаки",
    result: "Риск PE",
    probability: "Оценочная вероятность",
    recommendation: "Рекомендация",
    copy: "Копировать",
    copied: "Скопировано",
    discuss: "Обсудить результат с AI",
    disclaimer: "Результат не заменяет клиническое суждение и локальные протоколы лабораторной и лучевой диагностики.",
    risks: {
      low: "Низкий",
      moderate: "Средний",
      high: "Высокий",
    },
    criteria: {
      vtesigns: "Признаки ТГВ",
      altpe: "Другой диагноз менее вероятен",
      hr: "ЧСС > 100/мин",
      immobpe: "Иммобилизация / операция",
      prevpe: "Предыдущий ТГВ / PE",
      hemopt: "Кровохарканье",
      cancerpe: "Активный рак",
    },
  },
  en: {
    back: "← Back to calculators",
    title: "PE calculator",
    description: "Pulmonary embolism probability support using a Wells-style score. Use the result as part of overall clinical assessment.",
    age: "Patient age",
    criteriaTitle: "Select findings",
    result: "PE risk",
    probability: "Estimated probability",
    recommendation: "Recommendation",
    copy: "Copy",
    copied: "Copied",
    discuss: "Discuss result with AI",
    disclaimer: "The result does not replace clinical judgement or local imaging and laboratory protocols.",
    risks: {
      low: "Low",
      moderate: "Moderate",
      high: "High",
    },
    criteria: {
      vtesigns: "Signs of DVT",
      altpe: "Alternative diagnosis less likely",
      hr: "Heart rate > 100/min",
      immobpe: "Immobilization / surgery",
      prevpe: "Previous DVT / PE",
      hemopt: "Hemoptysis",
      cancerpe: "Active cancer",
    },
  },
} as const;

function fmt(value: number) {
  return value.toFixed(1).replace(".", ",");
}

function riskClass(risk: "low" | "moderate" | "high") {
  if (risk === "high") return "bg-red-500";
  if (risk === "moderate") return "bg-amber-500";
  return "bg-emerald-500";
}

export default function PeCalculatorPage({ embedded = false, onDiscussResult }: { embedded?: boolean; onDiscussResult?: (content: string) => void }) {
  const { language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const i18n = texts[lang];
  const [age, setAge] = useState("65");
  const [state, setState] = useState<PeCriterionState>({});
  const [copied, setCopied] = useState(false);

  const score = useMemo(() => calculatePeScore(state), [state]);
  const assessment = useMemo(() => assessPeRisk(score, Number(age)), [score, age]);

  const toggleCriterion = (key: PeCriterionKey, points: number) => {
    setState((current) => ({
      ...current,
      [key]: current[key] ? 0 : points,
    }));
  };

  const resultText = [
      "PE",
      `${i18n.age}: ${age}`,
      `Score: ${fmt(assessment.score)}`,
      `${i18n.result}: ${i18n.risks[assessment.risk]}`,
      `${i18n.probability}: ${assessment.probabilityLabel}`,
      `${i18n.recommendation}: ${assessment.recommendationFi}`,
    ].join("\n");

  const copyText = async () => {
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={embedded ? "p-4 text-slate-900" : "max-w-[1000px] mx-auto space-y-5 pb-10 text-slate-900 p-2 sm:p-4"}>
      {!embedded && <div>
        <Link href="/calculators" className="text-xs font-bold text-blue-600 hover:text-blue-700">
          {i18n.back}
        </Link>
        <h1 className="mt-2 text-2xl font-black text-slate-800 flex items-center gap-2">
          <Wind className="text-blue-600" size={26} /> {i18n.title}
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">{i18n.description}</p>
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">{i18n.age}</label>
            <input
              type="number"
              value={age}
              onChange={(event) => setAge(event.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
            />
          </div>

          <div className="text-[10px] font-extrabold text-blue-600 uppercase tracking-[0.2em] px-1 pt-2">{i18n.criteriaTitle}</div>
          <div className="space-y-2">
            {criteria.map((item) => {
              const active = !!state[item.key];

              return (
                <button
                  key={item.key}
                  onClick={() => toggleCriterion(item.key, item.points)}
                  className={`w-full p-4 text-left rounded-2xl border text-[12px] font-bold flex justify-between items-center transition-all ${active ? "bg-blue-600 text-white shadow-md border-blue-600" : "bg-slate-50 border-slate-100 hover:bg-slate-100"}`}
                >
                  <span>{i18n.criteria[item.key]}</span>
                  <span className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`text-[10px] font-black uppercase ${active ? "opacity-90" : "text-slate-400"}`}>
                      +{fmt(item.points)}
                    </span>
                    {active && <Check size={15} />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-200 shadow-sm min-h-[420px] flex flex-col">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-[12px] font-black text-blue-600 uppercase tracking-[0.2em]">{i18n.result}</span>
            </div>
            <div className="flex items-center gap-2">
              {onDiscussResult && <button type="button" onClick={() => onDiscussResult(resultText)} className="flex items-center gap-2 rounded-md border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"><MessageSquareShare size={15} />{i18n.discuss}</button>}
              <button onClick={copyText} className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-all">
                <Copy size={14} /> {copied ? i18n.copied : i18n.copy}
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-5">
            <div className={`${riskClass(assessment.risk)} p-8 rounded-[3rem] text-white shadow-xl`}>
              <p className="text-[10px] font-bold uppercase opacity-80 mb-2 tracking-widest text-center">{i18n.result}</p>
              <div className="text-8xl font-black text-center">{fmt(assessment.score)}</div>
              <p className="text-center text-[10px] font-bold uppercase tracking-wider bg-black/10 py-2 rounded-full mt-4">
                {i18n.risks[assessment.risk]} ({assessment.probabilityLabel})
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6 space-y-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{i18n.recommendation}</div>
                <div className="text-lg font-bold italic text-slate-800 leading-relaxed">{assessment.recommendationFi}</div>
              </div>
              <div className="text-xs font-bold text-slate-500">
                D-dimeeri-raja: <span className="text-slate-800">{assessment.dDimerThreshold}</span>
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
