"use client";

import { useMemo, useState } from "react";
import { Bot, Loader2, RefreshCcw, X } from "lucide-react";
import AgentPanel from "./AgentPanel";
import { useI18n } from "../../lib/useI18n";
import {
  buildPikaohjeAgentTemplate,
  parsePikaohjeAgentDraft,
  serializePikaohjeDraftForAgent,
  type PikaohjeAgentDraft,
} from "../../lib/pikaohjeet-v2/agentDraftFormat";

type PikaohjeAgentDockProps = {
  activeSlug?: string | null;
  draft: PikaohjeAgentDraft | null;
  onApplyDraft: (draft: PikaohjeAgentDraft) => void;
};

const labels = {
  fi: {
    open: "Pikaohje-agentti",
    title: "Pikaohje-agentti",
    description: "Pyydä agenttia tarkistamaan, täydentämään tai uudelleenrakentamaan kliininen pikaohje. Agentti päivittää vain editorin luonnosta.",
    close: "Sulje",
    refreshContext: "Päivitä korttikonteksti",
    loadingContext: "Päivitetään valittua kliinistä korttia...",
    contextFound: "Valittu kliininen kortti liitetty agenttiin",
    contextMissing: "Valitse ensin kliininen kortti editorissa.",
    currentTemplate: "Rakennemuoto",
    applyFailed: "Agentin luonnosta ei voitu tulkita pikaohje-muodossa. Tarkista että draft sisältää TITLE-, STATUS- ja SECTION-rakenteen.",
    noAutoSave: "Luonnoksen siirto päivittää vain editorin. Tallenna muutokset erikseen.",
  },
  ru: {
    open: "Агент pikaohje",
    title: "Агент pikaohje",
    description: "Попросите агента проверить, дополнить или переработать клиническую карточку. Агент обновляет только draft в редакторе.",
    close: "Закрыть",
    refreshContext: "Обновить контекст карточки",
    loadingContext: "Обновляется выбранная клиническая карточка...",
    contextFound: "Выбранная клиническая карточка передана агенту",
    contextMissing: "Сначала выберите клиническую карточку в редакторе.",
    currentTemplate: "Формат структуры",
    applyFailed: "Не удалось распознать draft агента в формате pikaohje. Нужны поля TITLE, STATUS и хотя бы одна SECTION.",
    noAutoSave: "Перенос draft обновляет только редактор. Сохранять изменения нужно отдельно.",
  },
  en: {
    open: "Pikaohje agent",
    title: "Pikaohje agent",
    description: "Ask the agent to review, expand, or restructure the clinical quick guide. The agent only updates the editor draft.",
    close: "Close",
    refreshContext: "Refresh card context",
    loadingContext: "Refreshing the selected clinical card...",
    contextFound: "Selected clinical card attached to the agent",
    contextMissing: "Select a clinical card in the editor first.",
    currentTemplate: "Structure format",
    applyFailed: "The agent draft could not be parsed as a pikaohje draft. It must include TITLE, STATUS and at least one SECTION.",
    noAutoSave: "Applying the draft updates the editor only. Save changes separately.",
  },
} as const;

export default function PikaohjeAgentDock({ activeSlug, draft, onApplyDraft }: PikaohjeAgentDockProps) {
  const { language } = useI18n();
  const l = labels[language] || labels.fi;
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [contextStatus, setContextStatus] = useState<"idle" | "loading" | "found" | "missing">("idle");

  const seed = useMemo(() => {
    if (!draft) return null;

    return {
      key: `${activeSlug || "no-slug"}-${refreshKey}-${draft.title}-${draft.sections.length}`,
      currentText: [
        "Current clinical quick guide draft. The user is editing this card right now.",
        "Review it as a draft only. Do not claim that anything has been saved or source-verified unless the data explicitly says so.",
        "",
        serializePikaohjeDraftForAgent(draft),
      ].join("\n"),
      currentTemplate: buildPikaohjeAgentTemplate(),
    };
  }, [activeSlug, draft, refreshKey]);

  function refreshContext() {
    setContextStatus("loading");
    window.setTimeout(() => {
      setRefreshKey((value) => value + 1);
      setContextStatus(draft ? "found" : "missing");
    }, 120);
  }

  async function openAgent() {
    setOpen(true);
    setContextStatus("loading");
    window.setTimeout(() => {
      setContextStatus(draft ? "found" : "missing");
    }, 120);
  }

  function applyDraftToEditor(agentDraft: string) {
    if (!draft) return;

    try {
      const nextDraft = parsePikaohjeAgentDraft(agentDraft, draft);
      onApplyDraft(nextDraft);
      setOpen(false);
    } catch (error) {
      console.error("Pikaohje agent apply failed", error);
      window.alert(l.applyFailed);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openAgent}
        className="fixed bottom-6 right-6 z-[45] inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-2xl shadow-slate-300 transition-all hover:bg-slate-800"
      >
        <Bot size={18} />
        {l.open}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm md:p-6">
          <div className="mx-auto max-w-6xl space-y-4">
            <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                  <Bot size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{l.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{l.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                    {contextStatus === "loading" && (
                      <span className="inline-flex items-center gap-2 text-slate-500">
                        <Loader2 size={14} className="animate-spin" />
                        {l.loadingContext}
                      </span>
                    )}
                    {contextStatus === "found" && draft && (
                      <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-700">
                        {l.contextFound}: {draft.title}
                      </span>
                    )}
                    {contextStatus === "missing" && (
                      <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-amber-700">
                        {l.contextMissing}
                      </span>
                    )}
                    {draft && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                        {l.currentTemplate}: {draft.sections.length} sections
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-400">{l.noAutoSave}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshContext}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCcw size={14} />
                  {l.refreshContext}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl p-3 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                  title={l.close}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <AgentPanel
              key={seed?.key || "pikaohje-agent-empty"}
              defaultContextType="pikaohje"
              initialText={seed?.currentText || ""}
              initialTemplate={seed?.currentTemplate || ""}
              onApplyDraft={draft ? applyDraftToEditor : undefined}
              compact
            />
          </div>
        </div>
      )}
    </>
  );
}
