"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import PrivacyNotice from "../PrivacyNotice";
import { getLocalizedVariant, type UiLanguage } from "../../lib/i18n";
import type { TemplateItem } from "../../lib/templates";

type Props = {
  template: TemplateItem;
  uiLanguage: UiLanguage;
  onClose: () => void;
  onApply: (templateText: string, summary?: string) => void;
};

const copy = {
  fi: {
    title: "AI-hionta",
    subtitle: "Kuvaa, mitä nykyisessä mallissa pitää muuttaa. AI säilyttää mallin rakenteen ja muuttaa vain pyydetyn osan.",
    instruction: "Ohje AI:lle",
    placeholder: "Esim. Lisää kivun voimakkuus valintakenttänä ja näytä tarkempi kuvaus vain jos kipua on.",
    run: "Ehdota muutosta",
    apply: "Käytä ehdotusta",
    close: "Sulje",
    preview: "Ehdotettu malli",
    summary: "Yhteenveto",
    noInstruction: "Kirjoita ensin ohje.",
    failed: "AI-hionta epäonnistui.",
  },
  ru: {
    title: "AI-коррекция",
    subtitle: "Опишите, что нужно изменить в текущем шаблоне. AI сохранит структуру и изменит только нужную часть.",
    instruction: "Инструкция для AI",
    placeholder: "Например: добавь поле выбора выраженности боли и показывай подробное описание только если боль есть.",
    run: "Предложить изменение",
    apply: "Применить предложение",
    close: "Закрыть",
    preview: "Предложенный шаблон",
    summary: "Краткое описание",
    noInstruction: "Сначала напишите инструкцию.",
    failed: "AI-коррекция не удалась.",
  },
  en: {
    title: "AI polish",
    subtitle: "Describe what should be changed in the current template. AI preserves the structure and edits only the requested part.",
    instruction: "Instruction for AI",
    placeholder: "For example: add pain severity as a select field and show details only if pain is present.",
    run: "Suggest change",
    apply: "Apply suggestion",
    close: "Close",
    preview: "Suggested template",
    summary: "Summary",
    noInstruction: "Write an instruction first.",
    failed: "AI polish failed.",
  },
  de: {
    title: "KI-Feinschliff",
    subtitle: "Beschreibe, was in der aktuellen Vorlage geändert werden soll. Die KI behält die Struktur bei und ändert nur den gewünschten Teil.",
    instruction: "Anweisung für die KI",
    placeholder: "Zum Beispiel: Füge die Schmerzstärke als Auswahlfeld hinzu und zeige die genauere Beschreibung nur, wenn Schmerzen vorhanden sind.",
    run: "Änderung vorschlagen",
    apply: "Vorschlag übernehmen",
    close: "Schließen",
    preview: "Vorgeschlagene Vorlage",
    summary: "Zusammenfassung",
    noInstruction: "Bitte zuerst eine Anweisung eingeben.",
    failed: "KI-Feinschliff fehlgeschlagen.",
  },
};

export default function TemplateAiPolishModal({ template, uiLanguage, onClose, onApply }: Props) {
  const c = getLocalizedVariant(copy, uiLanguage) ?? copy.en;
  const [instruction, setInstruction] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [privacy, setPrivacy] = useState<{ anonymized?: boolean; findingTypes?: string[] } | null>(null);

  const runAi = async () => {
    if (!instruction.trim()) {
      setError(c.noInstruction);
      return;
    }

    setIsLoading(true);
    setError("");
    setSummary("");
    setSuggestion("");
    setPrivacy(null);

    try {
      const response = await fetch("/api/templates/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "improve_template",
          uiLanguage,
          currentTemplate: template.content,
          userInstruction: instruction,
          clinicalContext: "terveysasema",
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.templateText) {
        throw new Error(data?.error || data?.validation?.errors?.[0] || c.failed);
      }

      setSummary(data.summary || "");
      setSuggestion(data.templateText || "");
      setPrivacy(data.privacy || null);
    } catch (err: any) {
      setError(err?.message || c.failed);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[92vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={14} /> {c.title}
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-1">{template.title}</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">{c.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          <label className="space-y-2 block">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.instruction}</span>
            <textarea
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder={c.placeholder}
              className="w-full h-28 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 text-sm leading-relaxed"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={runAi}
              disabled={isLoading}
              className="px-5 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-100"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {c.run}
            </button>
            {suggestion && (
              <button
                type="button"
                onClick={() => onApply(suggestion, summary)}
                className="px-5 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black flex items-center gap-2"
              >
                <Check size={14} /> {c.apply}
              </button>
            )}
          </div>

          {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">{error}</div>}
          {privacy && <PrivacyNotice privacy={privacy} />}
          {summary && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-900">
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">{c.summary}</div>
              {summary}
            </div>
          )}

          {suggestion && (
            <div className="space-y-2">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.preview}</div>
              <pre className="whitespace-pre-wrap p-5 rounded-2xl bg-slate-950 text-slate-50 text-xs leading-relaxed overflow-x-auto font-mono max-h-[46vh] overflow-y-auto">
                {suggestion}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
