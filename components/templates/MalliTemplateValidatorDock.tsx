"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";
import AgentPanel from "../ai-agent/AgentPanel";
import { useI18n } from "../../lib/useI18n";

type ValidationIssue = {
  severity: "error" | "warning";
  fieldId?: string;
  message: string;
  code?: string;
  position?: number;
};

type ValidationResult = {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  fields: Array<{ id: string; displayName?: string; type: string }>;
  summary: {
    fieldCount: number;
    errorCount: number;
    warningCount: number;
  };
};

const labels = {
  fi: {
    validate: "Tarkista syntaksi",
    agent: "AI-agentti",
    agentTitle: "Editorin AI-agentti",
    agentDescription: "Agentti käyttää editorissa olevaa luonnosta. Se ei tallenna mitään automaattisesti.",
    title: "Mallin syntaksitarkistus",
    ok: "Syntaksi näyttää hyvältä",
    errors: "Virheet",
    warnings: "Varoitukset",
    fields: "Kentät",
    noEditor: "Avaa ensin mallieditori.",
    failed: "Tarkistus epäonnistui",
    close: "Sulje",
  },
  ru: {
    validate: "Проверить синтаксис",
    agent: "AI-агент",
    agentTitle: "AI-агент редактора",
    agentDescription: "Агент использует текущий черновик из редактора. Он ничего не сохраняет автоматически.",
    title: "Проверка синтаксиса шаблона",
    ok: "Синтаксис выглядит корректно",
    errors: "Ошибки",
    warnings: "Предупреждения",
    fields: "Поля",
    noEditor: "Сначала откройте редактор шаблона.",
    failed: "Проверка не удалась",
    close: "Закрыть",
  },
  en: {
    validate: "Check syntax",
    agent: "AI agent",
    agentTitle: "Editor AI agent",
    agentDescription: "The agent uses the current editor draft. It does not save anything automatically.",
    title: "Template syntax check",
    ok: "Syntax looks good",
    errors: "Errors",
    warnings: "Warnings",
    fields: "Fields",
    noEditor: "Open the template editor first.",
    failed: "Validation failed",
    close: "Close",
  },
} as const;

function findTemplateEditorTextarea() {
  const textareas = Array.from(document.querySelectorAll("textarea")) as HTMLTextAreaElement[];
  return textareas.find((textarea) => {
    const className = textarea.getAttribute("class") || "";
    const placeholder = textarea.getAttribute("placeholder") || "";
    return className.includes("font-mono") || placeholder.includes("{{") || textarea.value.includes("{{");
  });
}

function setReactTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  nativeSetter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  textarea.focus();
}

export default function MalliTemplateValidatorDock() {
  const { language } = useI18n();
  const l = labels[language] || labels.fi;
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentTemplate, setAgentTemplate] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setEditorOpen(Boolean(findTemplateEditorTextarea())), 700);
    return () => window.clearInterval(timer);
  }, []);

  async function validateCurrentTemplate() {
    const textarea = findTemplateEditorTextarea();
    if (!textarea) {
      setError(l.noEditor);
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/templates/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: textarea.value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || l.failed);
      setResult(data);
    } catch (err: any) {
      setError(err.message || l.failed);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function openEditorAgent() {
    const textarea = findTemplateEditorTextarea();
    if (!textarea) {
      setError(l.noEditor);
      return;
    }
    setAgentTemplate(textarea.value);
    setAgentOpen(true);
  }

  function applyAgentDraftToEditor(draft: string) {
    const textarea = findTemplateEditorTextarea();
    if (!textarea) {
      setError(l.noEditor);
      return;
    }
    setReactTextareaValue(textarea, draft);
    setAgentOpen(false);
    setResult(null);
  }

  if (!editorOpen && !result && !error && !agentOpen) return null;

  return (
    <>
      {editorOpen && !agentOpen && (
        <div className="fixed bottom-24 right-6 z-[90] w-[min(28rem,calc(100vw-2rem))] space-y-3">
          <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-[2rem] shadow-2xl p-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={validateCurrentTemplate}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              {l.validate}
            </button>
            <button
              type="button"
              onClick={openEditorAgent}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black shadow-lg shadow-slate-200 hover:bg-slate-800"
            >
              <Bot size={15} />
              {l.agent}
            </button>
          </div>

          {(result || error) && (
            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-2xl p-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{l.title}</h3>
                  {result && (
                    <p className="text-xs text-slate-500 mt-1">
                      {l.fields}: {result.summary.fieldCount} · {l.errors}: {result.summary.errorCount} · {l.warnings}: {result.summary.warningCount}
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => { setResult(null); setError(null); }} className="text-slate-400 hover:text-slate-700 text-xl leading-none" title={l.close}>×</button>
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-100 text-red-700 p-4 text-sm font-bold">
                  {error}
                </div>
              )}

              {result && result.ok && result.warnings.length === 0 && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {l.ok}
                </div>
              )}

              {result && result.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-red-600">{l.errors}</div>
                  {result.errors.map((issue, index) => (
                    <div key={`error-${index}`} className="rounded-2xl bg-red-50 border border-red-100 text-red-700 p-3 text-xs font-semibold flex gap-2">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        {issue.fieldId && <div className="font-black">{issue.fieldId}</div>}
                        <div>{issue.message}</div>
                        {issue.code && <div className="text-red-400 mt-1">{issue.code}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result && result.warnings.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-widest text-amber-600">{l.warnings}</div>
                  {result.warnings.map((issue, index) => (
                    <div key={`warning-${index}`} className="rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 p-3 text-xs font-semibold flex gap-2">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        {issue.fieldId && <div className="font-black">{issue.fieldId}</div>}
                        <div>{issue.message}</div>
                        {issue.code && <div className="text-amber-500 mt-1">{issue.code}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {agentOpen && (
        <div className="fixed inset-0 z-[95] bg-slate-900/50 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Bot size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{l.agentTitle}</h2>
                  <p className="text-sm text-slate-500 mt-1">{l.agentDescription}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAgentOpen(false)}
                className="p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-700"
                title={l.close}
              >
                <X size={20} />
              </button>
            </div>

            <AgentPanel
              key={`editor-agent-${agentTemplate.length}-${agentTemplate.slice(0, 20)}`}
              defaultContextType="malli"
              initialText="Template editor draft. The user is editing this template right now. Preserve template syntax unless explicitly asked otherwise."
              initialTemplate={agentTemplate}
              onApplyDraft={applyAgentDraftToEditor}
              compact
            />
          </div>
        </div>
      )}
    </>
  );
}
