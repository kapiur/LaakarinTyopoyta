"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, Copy, Loader2, Sparkles, X } from 'lucide-react';
import { useI18n } from '../lib/useI18n';

type AiMode = 'transform_instruction' | 'create_from_sample' | 'improve_template' | 'create_base_template_from_topic';

type AiResponse = {
  ok: boolean;
  status: string;
  summary?: string;
  templateTitle?: string;
  templateCategory?: string;
  templateText?: string;
  warnings?: string[];
  limitations?: string[];
  validation?: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  };
};

const copy = {
  fi: {
    open: 'AI-avustaja',
    title: 'Mallin AI-avustaja',
    close: 'Sulje',
    mode: 'Tila',
    transform: 'Muokkaa ohjeen perusteella',
    sample: 'Luo malli esimerkkitekstistä',
    improve: 'Paranna nykyistä mallia',
    base: 'Luo perusmalli aiheesta',
    instruction: 'Ohje',
    instructionPlaceholder: 'Kirjoita ohje millä tahansa kielellä...',
    sampleText: 'Esimerkkiteksti',
    samplePlaceholder: 'Liitä lääkärin tekstiesimerkki...',
    topic: 'Aihe',
    topicPlaceholder: 'Esim. polvikivun vastaanottomalli',
    allowSkeleton: 'Salli tekninen runko ilman lähteitä',
    run: 'Luo ehdotus',
    apply: 'Käytä muutosta editorissa',
    copyResult: 'Kopioi ehdotus',
    copied: 'Kopioitu',
    result: 'AI-ehdotus',
    noEditor: 'Avaa ensin mallin editori.',
    noResult: 'Ei ehdotusta vielä.',
    needsSources: 'Lähteitä tarvitaan lähdepohjaisen lääketieteellisen perusmallin luomiseen.',
    failed: 'AI-pyyntö epäonnistui.',
  },
  ru: {
    open: 'AI-помощник',
    title: 'AI-помощник шаблона',
    close: 'Закрыть',
    mode: 'Режим',
    transform: 'Изменить по инструкции',
    sample: 'Создать из образца текста',
    improve: 'Улучшить текущий шаблон',
    base: 'Создать базовый шаблон по теме',
    instruction: 'Инструкция',
    instructionPlaceholder: 'Напишите инструкцию на любом языке...',
    sampleText: 'Образец текста',
    samplePlaceholder: 'Вставьте пример врачебного текста...',
    topic: 'Тема',
    topicPlaceholder: 'Например: шаблон осмотра колена',
    allowSkeleton: 'Разрешить технический каркас без источников',
    run: 'Создать предложение',
    apply: 'Вставить в редактор',
    copyResult: 'Копировать предложение',
    copied: 'Скопировано',
    result: 'AI-предложение',
    noEditor: 'Сначала откройте редактор шаблона.',
    noResult: 'Пока нет предложения.',
    needsSources: 'Для медицинского базового шаблона по источникам нужны источники.',
    failed: 'AI-запрос не удался.',
  },
  en: {
    open: 'AI assistant',
    title: 'Template AI assistant',
    close: 'Close',
    mode: 'Mode',
    transform: 'Modify by instruction',
    sample: 'Create from sample text',
    improve: 'Improve current template',
    base: 'Create base template by topic',
    instruction: 'Instruction',
    instructionPlaceholder: 'Write an instruction in any language...',
    sampleText: 'Sample text',
    samplePlaceholder: 'Paste a doctor note example...',
    topic: 'Topic',
    topicPlaceholder: 'For example: knee examination template',
    allowSkeleton: 'Allow technical skeleton without sources',
    run: 'Create suggestion',
    apply: 'Apply to editor',
    copyResult: 'Copy suggestion',
    copied: 'Copied',
    result: 'AI suggestion',
    noEditor: 'Open the template editor first.',
    noResult: 'No suggestion yet.',
    needsSources: 'Sources are required to create a source-based medical base template.',
    failed: 'AI request failed.',
  },
} as const;

function isMalliPath(pathname: string | null) {
  return pathname === '/malli' || pathname === '/templates/redesign';
}

function findTemplateContentTextarea() {
  const textareas = Array.from(document.querySelectorAll('textarea')) as HTMLTextAreaElement[];

  return textareas.find((textarea) => {
    const className = String(textarea.className || '');
    return className.includes('font-mono') && className.includes('min-h-[480px]');
  }) || null;
}

function dispatchTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

export default function MalliTemplateAiAssistantEnhancer() {
  const pathname = usePathname();
  const { language } = useI18n();
  const c = copy[language] ?? copy.fi;
  const enabled = isMalliPath(pathname);
  const [editorOpen, setEditorOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<AiMode>('transform_instruction');
  const [instruction, setInstruction] = useState('');
  const [sampleText, setSampleText] = useState('');
  const [topic, setTopic] = useState('');
  const [allowSkeleton, setAllowSkeleton] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const checkEditor = () => {
      setEditorOpen(Boolean(findTemplateContentTextarea()));
    };

    checkEditor();
    const timer = window.setInterval(checkEditor, 700);
    return () => window.clearInterval(timer);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !editorOpen) {
      setDialogOpen(false);
      setResult(null);
      setError(null);
    }
    if (!enabled) setEditorOpen(false);
  }, [enabled, editorOpen]);

  if (!enabled || !editorOpen) return null;

  const getCurrentTemplate = () => findTemplateContentTextarea()?.value || '';

  const runAi = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const payload = {
        mode,
        uiLanguage: language,
        currentTemplate: getCurrentTemplate(),
        userInstruction: instruction,
        sampleText,
        topic,
        clinicalContext: 'terveysasema',
        allowGeneralTechnicalSkeleton: allowSkeleton,
        allowedSources: [],
      };

      const response = await fetch('/api/templates/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || c.failed);
      setResult(data);
    } catch (err: any) {
      setError(err?.message || c.failed);
    } finally {
      setLoading(false);
    }
  };

  const applyResult = () => {
    if (!result?.templateText) return;
    const textarea = findTemplateContentTextarea();
    if (!textarea) {
      setError(c.noEditor);
      return;
    }
    dispatchTextareaValue(textarea, result.templateText);
  };

  const copySuggestion = async () => {
    if (!result?.templateText) return;
    await navigator.clipboard.writeText(result.templateText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed top-6 right-24 z-[91] flex flex-col items-end gap-3">
      {dialogOpen && (
        <div className="mt-2 w-[520px] max-w-[calc(100vw-2rem)] max-h-[78vh] overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white shadow-2xl shadow-slate-300/40 flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-600">{c.open}</div>
              <div className="text-lg font-black text-slate-900">{c.title}</div>
            </div>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              title={c.close}
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.mode}</label>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as AiMode)}
                className="w-full rounded-2xl bg-slate-50 p-3 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5"
              >
                <option value="transform_instruction">{c.transform}</option>
                <option value="create_from_sample">{c.sample}</option>
                <option value="improve_template">{c.improve}</option>
                <option value="create_base_template_from_topic">{c.base}</option>
              </select>
            </div>

            {(mode === 'transform_instruction' || mode === 'improve_template') && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.instruction}</label>
                <textarea
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  placeholder={c.instructionPlaceholder}
                  className="min-h-[110px] w-full rounded-2xl bg-slate-50 p-3 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5"
                />
              </div>
            )}

            {mode === 'create_from_sample' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.sampleText}</label>
                <textarea
                  value={sampleText}
                  onChange={(event) => setSampleText(event.target.value)}
                  placeholder={c.samplePlaceholder}
                  className="min-h-[150px] w-full rounded-2xl bg-slate-50 p-3 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5"
                />
              </div>
            )}

            {mode === 'create_base_template_from_topic' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.topic}</label>
                  <input
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder={c.topicPlaceholder}
                    className="w-full rounded-2xl bg-slate-50 p-3 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-black text-slate-600">
                  <input
                    type="checkbox"
                    checked={allowSkeleton}
                    onChange={(event) => setAllowSkeleton(event.target.checked)}
                  />
                  {c.allowSkeleton}
                </label>
              </div>
            )}

            {error && <div className="rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}

            {result?.status === 'needs_sources' && (
              <div className="rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-700">
                {c.needsSources}
                {result.limitations?.length ? (
                  <ul className="mt-2 list-disc pl-4">
                    {result.limitations.map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
                ) : null}
              </div>
            )}

            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.result}</div>
              <div className="min-h-[160px] whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-white">
                {result?.templateText || result?.summary || c.noResult}
              </div>
            </div>

            {result?.validation && !result.validation.ok && (
              <div className="rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">
                {result.validation.errors.map((item, index) => <div key={index}>{item}</div>)}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={runAi}
              disabled={loading}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {c.run}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copySuggestion}
                disabled={!result?.templateText}
                className="rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 ring-1 ring-slate-100 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-2"
              >
                <Copy size={13} /> {copied ? c.copied : c.copyResult}
              </button>
              <button
                type="button"
                onClick={applyResult}
                disabled={!result?.templateText}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {c.apply}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="flex min-w-[250px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-blue-300/30 hover:bg-blue-700 transition-colors"
      >
        <Bot size={15} /> {c.open}
      </button>
    </div>
  );
}
