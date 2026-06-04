"use client";

import { useState } from "react";
import { Bot, X } from "lucide-react";
import AgentPanel from "./AgentPanel";
import { useI18n } from "../../lib/useI18n";

const labels = {
  fi: {
    open: "AI-agentti",
    title: "Malli-agentti",
    description: "Pyydä agenttia analysoimaan, parantamaan tai rakentamaan tekstimallia. Agentti ei tallenna mitään automaattisesti.",
    close: "Sulje",
  },
  ru: {
    open: "AI-агент",
    title: "Агент шаблонов",
    description: "Попросите агента проанализировать, улучшить или собрать текстовый шаблон. Агент ничего не сохраняет автоматически.",
    close: "Закрыть",
  },
  en: {
    open: "AI agent",
    title: "Template agent",
    description: "Ask the agent to analyze, improve or build a text template. The agent does not save anything automatically.",
    close: "Close",
  },
} as const;

export default function MalliAgentDock() {
  const { language } = useI18n();
  const l = labels[language] || labels.fi;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[45] inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black shadow-2xl shadow-slate-300 hover:bg-slate-800 transition-all"
      >
        <Bot size={18} />
        {l.open}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Bot size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{l.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{l.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-700"
                title={l.close}
              >
                <X size={20} />
              </button>
            </div>

            <AgentPanel defaultContextType="malli" compact />
          </div>
        </div>
      )}
    </>
  );
}
