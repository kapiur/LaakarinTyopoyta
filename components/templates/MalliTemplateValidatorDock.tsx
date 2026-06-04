"use client";

import { useEffect, useState } from "react";
import { Bot, X } from "lucide-react";
import AgentPanel from "../ai-agent/AgentPanel";
import { useI18n } from "../../lib/useI18n";

const labels = {
  fi: {
    agent: "AI-agentti",
    agentTitle: "Editorin AI-agentti",
    agentDescription: "Agentti käyttää editorissa olevaa malliluonnosta. Se ei tallenna mitään automaattisesti.",
    close: "Sulje",
  },
  ru: {
    agent: "AI-агент",
    agentTitle: "AI-агент редактора",
    agentDescription: "Агент использует текущий черновик шаблона из редактора. Он ничего не сохраняет автоматически.",
    close: "Закрыть",
  },
  en: {
    agent: "AI agent",
    agentTitle: "Editor AI agent",
    agentDescription: "The agent uses the current template draft from the editor. It does not save anything automatically.",
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
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentTemplate, setAgentTemplate] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setEditorOpen(Boolean(findTemplateEditorTextarea()));
    }, 700);
    return () => window.clearInterval(timer);
  }, []);

  function openEditorAgent() {
    const textarea = findTemplateEditorTextarea();
    if (!textarea) return;
    setAgentTemplate(textarea.value);
    setAgentOpen(true);
  }

  function applyAgentDraftToEditor(draft: string) {
    const textarea = findTemplateEditorTextarea();
    if (!textarea) return;
    setReactTextareaValue(textarea, draft);
    setAgentOpen(false);
  }

  if (!editorOpen && !agentOpen) return null;

  return (
    <>
      {editorOpen && !agentOpen && (
        <div className="fixed bottom-24 right-6 z-[90] w-[min(14rem,calc(100vw-2rem))]">
          <button
            type="button"
            onClick={openEditorAgent}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black shadow-2xl shadow-slate-300 hover:bg-slate-800 transition-all"
          >
            <Bot size={15} />
            {l.agent}
          </button>
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
