"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, MessageSquareShare, Stethoscope } from "lucide-react";
import { useI18n } from "../../../lib/useI18n";
import { assessCadRisk, type CadAgeRange, type CadFactorKey, type CadState, type CadSex, type CadSymptomType } from "../../../lib/calculators/modules/cad/formulas";

type UiLang = "fi" | "ru" | "en";

const defaultState: CadState = {
  ageRange: "50-59",
  sex: "male",
  symptoms: "typical",
  factors: {
    family: false,
    smoking: false,
    dyslipidemia: false,
    diabetes: false,
    hypertension: false,
  },
};

const texts = {
  fi: {
    back: "← Takaisin laskureihin",
    title: "CAD-riski",
    description: "Sepelvaltimotaudin ennakkotodennäköisyyden tuki oiretyypin, iän, sukupuolen ja riskitekijöiden perusteella.",
    sex: "Sukupuoli",
    male: "Mies",
    female: "Nainen",
    age: "Ikä",
    symptoms: "Kivun tyyppi",
    factors: "Riskitekijät",
    result: "Ennakkotodennäköisyys",
    riskFactorsCount: "Riskitekijöitä",
    ageGroup: "Ikäryhmä",
    copy: "Kopioi",
    copied: "Kopioitu",
    discuss: "Keskustele tuloksesta AI:n kanssa",
    disclaimer: "Käytä tulosta osana kliinistä kokonaisarviota ja sovita jatkotutkimukset paikallisten ohjeiden mukaan.",
    symptomOptions: {
      typical: "Tyypillinen rintakipu",
      atypical: "Epätyypillinen",
      other: "Muu kipu",
    },
    factorLabels: {
      family: "Sukurasite",
      smoking: "Tupakointi",
      dyslipidemia: "Dyslipidemia",
      diabetes: "Diabetes",
      hypertension: "Verenpainetauti",
    },
    levelLabels: {
      low: "Matalampi riski",
      elevated: "Kohonnut riski",
    },
  },
  ru: {
    back: "← Назад к калькуляторам",
    title: "Риск CAD",
    description: "Поддержка оценки предтестовой вероятности ишемической болезни сердца по типу симптомов, возрасту, полу и факторам риска.",
    sex: "Пол",
    male: "Мужчина",
    female: "Женщина",
    age: "Возраст",
    symptoms: "Тип боли",
    factors: "Факторы риска",
    result: "Предтестовая вероятность",
    riskFactorsCount: "Факторов риска",
    ageGroup: "Возрастная группа",
    copy: "Копировать",
    copied: "Скопировано",
    discuss: "Обсудить результат с AI",
    disclaimer: "Используйте результат как часть общей клинической оценки и выбирайте дальнейшие исследования по локальным рекомендациям.",
    symptomOptions: {
      typical: "Типичная стенокардия",
      atypical: "Атипичная",
      other: "Другая боль",
    },
    factorLabels: {
      family: "Семейный анамнез",
      smoking: "Курение",
      dyslipidemia: "Дислипидемия",
      diabetes: "Диабет",
      hypertension: "Гипертензия",
    },
    levelLabels: {
      low: "Ниже риск",
      elevated: "Повышенный риск",
    },
  },
  en: {
    back: "← Back to calculators",
    title: "CAD risk",
    description: "Support for pre-test coronary artery disease probability based on symptom type, age, sex, and risk factors.",
    sex: "Sex",
    male: "Male",
    female: "Female",
    age: "Age",
    symptoms: "Pain type",
    factors: "Risk factors",
    result: "Pre-test probability",
    riskFactorsCount: "Risk factors",
    ageGroup: "Age group",
    copy: "Copy",
    copied: "Copied",
    discuss: "Discuss result with AI",
    disclaimer: "Use the result as part of overall clinical assessment and align further testing with local guidance.",
    symptomOptions: {
      typical: "Typical chest pain",
      atypical: "Atypical",
      other: "Other pain",
    },
    factorLabels: {
      family: "Family history",
      smoking: "Smoking",
      dyslipidemia: "Dyslipidemia",
      diabetes: "Diabetes",
      hypertension: "Hypertension",
    },
    levelLabels: {
      low: "Lower risk",
      elevated: "Elevated risk",
    },
  },
} as const;

const ageRanges: CadAgeRange[] = ["30-39", "40-49", "50-59", "60-69", "70-80"];
const symptomKeys: CadSymptomType[] = ["typical", "atypical", "other"];
const factorKeys: CadFactorKey[] = ["family", "smoking", "dyslipidemia", "diabetes", "hypertension"];

export default function CadCalculatorPage({ embedded = false, onDiscussResult }: { embedded?: boolean; onDiscussResult?: (content: string) => void }) {
  const { language } = useI18n();
  const lang: UiLang = ["fi", "ru", "en"].includes(language as UiLang) ? (language as UiLang) : "fi";
  const i18n = texts[lang];
  const [state, setState] = useState<CadState>(defaultState);
  const [copied, setCopied] = useState(false);

  const assessment = useMemo(() => assessCadRisk(state), [state]);

  const setSex = (sex: CadSex) => setState((current) => ({ ...current, sex }));
  const setAgeRange = (ageRange: CadAgeRange) => setState((current) => ({ ...current, ageRange }));
  const setSymptoms = (symptoms: CadSymptomType) => setState((current) => ({ ...current, symptoms }));
  const toggleFactor = (key: CadFactorKey) =>
    setState((current) => ({
      ...current,
      factors: { ...current.factors, [key]: !current.factors[key] },
    }));

  const resultText = [
      "CAD risk",
      `${i18n.sex}: ${state.sex === "male" ? i18n.male : i18n.female}`,
      `${i18n.age}: ${state.ageRange}`,
      `${i18n.symptoms}: ${i18n.symptomOptions[state.symptoms]}`,
      `${i18n.riskFactorsCount}: ${assessment.factorCount}`,
      `${i18n.result}: ${assessment.probability}%`,
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
          <Stethoscope className="text-blue-600" size={26} /> {i18n.title}
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">{i18n.description}</p>
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">{i18n.sex}</label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                onClick={() => setSex("male")}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${state.sex === "male" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}
              >
                {i18n.male}
              </button>
              <button
                onClick={() => setSex("female")}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${state.sex === "female" ? "bg-white shadow-sm text-pink-600" : "text-slate-500"}`}
              >
                {i18n.female}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">{i18n.age}</label>
            <select
              value={state.ageRange}
              onChange={(event) => setAgeRange(event.target.value as CadAgeRange)}
              className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
            >
              {ageRanges.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">{i18n.symptoms}</label>
            <div className="grid grid-cols-1 gap-2">
              {symptomKeys.map((symptom) => (
                <button
                  key={symptom}
                  onClick={() => setSymptoms(symptom)}
                  className={`p-4 text-left rounded-2xl border text-[12px] font-bold transition-all ${state.symptoms === symptom ? "bg-blue-600 text-white shadow-md border-blue-600" : "bg-slate-50 border-slate-100 hover:bg-slate-100"}`}
                >
                  {i18n.symptomOptions[symptom]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">{i18n.factors}</label>
            <div className="grid grid-cols-1 gap-2">
              {factorKeys.map((factor) => (
                <button
                  key={factor}
                  onClick={() => toggleFactor(factor)}
                  className={`p-4 text-left rounded-2xl border text-[12px] font-bold transition-all flex items-center justify-between ${state.factors[factor] ? "bg-amber-500 text-white shadow-md border-amber-500" : "bg-slate-50 border-slate-100 hover:bg-slate-100"}`}
                >
                  <span>{i18n.factorLabels[factor]}</span>
                  {state.factors[factor] && <Check size={15} />}
                </button>
              ))}
            </div>
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
            <div className={`p-8 rounded-[3rem] text-white shadow-xl ${assessment.riskLevel === "low" ? "bg-blue-500" : "bg-amber-500"}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-center opacity-80">{i18n.result}</p>
              <div className="text-8xl font-black text-center mt-2">
                {assessment.probability}
                <span className="text-3xl">%</span>
              </div>
              <p className="text-center text-[10px] font-bold uppercase tracking-wider bg-black/10 py-2 rounded-full mt-4">
                {i18n.levelLabels[assessment.riskLevel]}
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6 space-y-3">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{i18n.factors}</div>
              <div className="text-sm font-bold text-slate-700">
                {i18n.riskFactorsCount}: <span className="text-slate-900">{assessment.factorCount}</span>
              </div>
              <div className="text-sm font-bold text-slate-700">
                {i18n.ageGroup}: <span className="text-slate-900">{state.ageRange}</span>
              </div>
              <div className="text-sm font-bold text-slate-700">
                {i18n.symptoms}: <span className="text-slate-900">{i18n.symptomOptions[state.symptoms]}</span>
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
