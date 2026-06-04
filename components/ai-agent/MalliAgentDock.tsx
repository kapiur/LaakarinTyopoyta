"use client";

import { useState } from "react";
import { Bot, Loader2, RefreshCcw, X } from "lucide-react";
import AgentPanel from "./AgentPanel";
import { useI18n } from "../../lib/useI18n";

type TemplateItem = {
  id: number;
  title: string;
  content: string;
  categoryId: number;
  author?: string;
};

type TemplateCategory = {
  id: number;
  name: string;
  templates?: TemplateItem[];
};

type TemplateMatch = {
  template: TemplateItem;
  category: TemplateCategory;
};

type AgentSeed = {
  key: string;
  title: string;
  categoryName: string;
  currentText: string;
  currentTemplate: string;
};

const labels = {
  fi: {
    open: "AI-agentti",
    title: "Malli-agentti",
    description: "Pyydä agenttia analysoimaan, parantamaan tai rakentamaan tekstimallia. Agentti ei tallenna mitään automaattisesti.",
    close: "Sulje",
    refreshContext: "Päivitä mallikonteksti",
    loadingContext: "Haetaan valittua mallia...",
    contextFound: "Valittu malli liitetty agenttiin",
    contextMissing: "Valittua mallia ei tunnistettu automaattisesti. Voit silti liittää tekstin käsin.",
    currentTemplate: "Nykyinen malli",
  },
  ru: {
    open: "AI-агент",
    title: "Агент шаблонов",
    description: "Попросите агента проанализировать, улучшить или собрать текстовый шаблон. Агент ничего не сохраняет автоматически.",
    close: "Закрыть",
    refreshContext: "Обновить контекст шаблона",
    loadingContext: "Загружается выбранный шаблон...",
    contextFound: "Выбранный шаблон передан агенту",
    contextMissing: "Выбранный шаблон не удалось определить автоматически. Текст можно вставить вручную.",
    currentTemplate: "Текущий шаблон",
  },
  en: {
    open: "AI agent",
    title: "Template agent",
    description: "Ask the agent to analyze, improve or build a text template. The agent does not save anything automatically.",
    close: "Close",
    refreshContext: "Refresh template context",
    loadingContext: "Loading selected template...",
    contextFound: "Selected template attached to the agent",
    contextMissing: "The selected template could not be detected automatically. You can still paste text manually.",
    currentTemplate: "Current template",
  },
} as const;

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9åäöа-яё]+/gi, "");
}

function getSelectedTemplateTitleFromDom() {
  const buttons = Array.from(document.querySelectorAll("button"));
  const selectedButton = buttons.find((button) => {
    const className = button.getAttribute("class") || "";
    return className.includes("bg-slate-900") && className.includes("text-white") && button.textContent?.trim();
  });

  const text = selectedButton?.textContent?.trim() || "";
  if (!text) return "";

  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return lines[0] || text;
}

function getRenderedResultFromDom() {
  const resultLabels = ["Tulos", "Результат", "Result"];
  const sections = Array.from(document.querySelectorAll("section"));
  const resultSection = sections.find((section) => resultLabels.some((label) => section.textContent?.includes(label)) && section.textContent?.length && section.textContent.length > 20);
  if (!resultSection) return "";

  const text = resultSection.textContent || "";
  const cleaned = text
    .replace(/^\s*(Tulos|Результат|Result)\s*/i, "")
    .replace(/AI-hionta|AI-коррекция|AI polish|Kopioi|Копировать|Copy|Скопировано|Kopioitu|Copied/g, "")
    .trim();

  return cleaned.length > 20 ? cleaned : "";
}

function flattenTemplates(categories: TemplateCategory[]) {
  return categories.flatMap((category) => (category.templates || []).map((template) => ({ template, category })));
}

function findTemplateMatch(categories: TemplateCategory[], selectedTitle: string): TemplateMatch | undefined {
  const flattened = flattenTemplates(categories);
  const rawSelected = selectedTitle.trim();
  const normalizedSelected = normalizeForMatch(rawSelected);
  if (!normalizedSelected) return undefined;

  const exact = flattened.find(({ template }) => template.title.trim() === rawSelected);
  if (exact) return exact;

  const normalizedExact = flattened.find(({ template }) => normalizeForMatch(template.title) === normalizedSelected);
  if (normalizedExact) return normalizedExact;

  const prefixOrContained = flattened
    .filter(({ template, category }) => {
      const normalizedTitle = normalizeForMatch(template.title);
      const normalizedTitleWithCategory = normalizeForMatch(`${template.title}${category.name}`);
      return (
        normalizedSelected.startsWith(normalizedTitle) ||
        normalizedTitle.startsWith(normalizedSelected) ||
        normalizedTitleWithCategory === normalizedSelected ||
        normalizedTitleWithCategory.startsWith(normalizedSelected) ||
        normalizedSelected.startsWith(normalizedTitleWithCategory)
      );
    })
    .sort((a, b) => b.template.title.length - a.template.title.length);

  return prefixOrContained[0];
}

export default function MalliAgentDock() {
  const { language } = useI18n();
  const l = labels[language] || labels.fi;
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState<AgentSeed | null>(null);
  const [contextStatus, setContextStatus] = useState<"idle" | "loading" | "found" | "missing">("idle");

  async function loadTemplateContext() {
    setContextStatus("loading");
    try {
      const selectedTitle = getSelectedTemplateTitleFromDom();
      const renderedResult = getRenderedResultFromDom();

      if (!selectedTitle) {
        setSeed(null);
        setContextStatus("missing");
        return;
      }

      const response = await fetch("/api/templates");
      const data = await response.json();
      const categories: TemplateCategory[] = Array.isArray(data) ? data : [];
      const match = findTemplateMatch(categories, selectedTitle);

      if (!match) {
        setSeed({
          key: `manual-${Date.now()}`,
          title: selectedTitle,
          categoryName: "",
          currentText: renderedResult ? `Selected template: ${selectedTitle}\n\nRendered output:\n${renderedResult}` : `Selected template: ${selectedTitle}`,
          currentTemplate: "",
        });
        setContextStatus("missing");
        return;
      }

      setSeed({
        key: `${match.template.id}-${Date.now()}`,
        title: match.template.title,
        categoryName: match.category.name,
        currentText: [
          `Selected template: ${match.template.title}`,
          `Section: ${match.category.name}`,
          renderedResult ? `Rendered output:\n${renderedResult}` : "Rendered output: not available or no fields filled",
        ].join("\n\n"),
        currentTemplate: match.template.content,
      });
      setContextStatus("found");
    } catch (error) {
      console.error("Malli agent context load failed", error);
      setContextStatus("missing");
    }
  }

  async function openAgent() {
    setOpen(true);
    await window.setTimeout(() => undefined, 0);
    void loadTemplateContext();
  }

  return (
    <>
      <button
        type="button"
        onClick={openAgent}
        className="fixed bottom-6 right-6 z-[45] inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black shadow-2xl shadow-slate-300 hover:bg-slate-800 transition-all"
      >
        <Bot size={18} />
        {l.open}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Bot size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{l.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{l.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                    {contextStatus === "loading" && <span className="inline-flex items-center gap-2 text-slate-500"><Loader2 size={14} className="animate-spin" /> {l.loadingContext}</span>}
                    {contextStatus === "found" && <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{l.contextFound}: {seed?.title}</span>}
                    {contextStatus === "missing" && <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{l.contextMissing}</span>}
                    {seed?.currentTemplate && <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200">{l.currentTemplate}: {seed.currentTemplate.length} chars</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadTemplateContext}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCcw size={14} />
                  {l.refreshContext}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-700"
                  title={l.close}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <AgentPanel
              key={seed?.key || "malli-agent-empty"}
              defaultContextType="malli"
              initialText={seed?.currentText || ""}
              initialTemplate={seed?.currentTemplate || ""}
              compact
            />
          </div>
        </div>
      )}
    </>
  );
}
