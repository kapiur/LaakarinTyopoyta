"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, Copy, Loader2, Sparkles, X } from 'lucide-react';
import { useI18n } from '../lib/useI18n';

type AiMode = 'transform_instruction' | 'create_from_sample' | 'improve_template' | 'create_base_template_from_topic';
type ApplyMode = 'replace' | 'insert' | 'append';

type UsedSource = {
  title: string;
  url?: string;
  sourceType?: string;
  usedFor?: string;
};

type AiResponse = {
  ok: boolean;
  status: string;
  summary?: string;
  templateTitle?: string;
  templateCategory?: string;
  templateText?: string;
  warnings?: string[];
  limitations?: string[];
  usedSources?: UsedSource[];
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
    sourceSearchInfo: 'AI hyödyntää luotettavia suomalaisia ja eurooppalaisia lääketieteellisiä lähteitä kliinisen tarkistuslistan muodostamiseen.',
    allowSkeleton: 'Salli tekninen runko, jos luotettavaa lähdettä ei löydy',
    run: 'Luo ehdotus',
    apply: 'Käytä',
    replace: 'Korvaa koko malli',
    insert: 'Lisää kursoriin',
    append: 'Lisää loppuun',
    replaceConfirm: 'Korvataanko koko mallin sisältö AI-ehdotuksella? Tätä ei tallenneta ennen kuin painat Tallenna.',
    copyResult: 'Kopioi ehdotus',
    copied: 'Kopioitu',
    applied: 'Lisätty editoriin. Muista tallentaa malli erikseen.',
    result: 'AI-ehdotus',
    noEditor: 'Avaa ensin mallin editori.',
    noResult: 'Ei ehdotusta vielä.',
    needsSources: 'Luotettavaa lähdettä ei löytynyt automaattisesti.',
    failed: 'AI-pyyntö epäonnistui.',
    validationError: 'AI-ehdotuksessa on virheitä. Tarkista ennen käyttöä.',
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
    sourceSearchInfo: 'AI использует доверенные финские и европейские медицинские источники как клиническую основу для шаблона.',
    allowSkeleton: 'Разрешить технический каркас, если достоверный источник не найден',
    run: 'Создать предложение',
    apply: 'Применить',
    replace: 'Заменить весь шаблон',
    insert: 'Вставить в позицию курсора',
    append: 'Добавить в конец',
    replaceConfirm: 'Заменить всё содержимое шаблона AI-предложением? Это не будет сохранено, пока вы не нажмёте Сохранить.',
    copyResult: 'Копировать предложение',
    copied: 'Скопировано',
    applied: 'Вставлено в редактор. Не забудьте отдельно сохранить шаблон.',
    result: 'AI-предложение',
    noEditor: 'Сначала откройте редактор шаблона.',
    noResult: 'Пока нет предложения.',
    needsSources: 'Достоверный источник не найден автоматически.',
    failed: 'AI-запрос не удался.',
    validationError: 'В AI-предложении есть ошибки. Проверьте перед использованием.',
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
    sourceSearchInfo: 'AI uses trusted Finnish and European medical sources as a clinical basis for the template.',
    allowSkeleton: 'Allow technical skeleton if no trusted source is found',
    run: 'Create suggestion',
    apply: 'Apply',
    replace: 'Replace whole template',
    insert: 'Insert at cursor',
    append: 'Append to end',
    replaceConfirm: 'Replace the whole template content with the AI suggestion? It will not be saved until you click Save.',
    copyResult: 'Copy suggestion',
    copied: 'Copied',
    applied: 'Applied to the editor. Remember to save the template separately.',
    result: 'AI suggestion',
    noEditor: 'Open the template editor first.',
    noResult: 'No suggestion yet.',
    needsSources: 'No trusted source was found automatically.',
    failed: 'AI request failed.',
    validationError: 'AI suggestion has errors. Review before use.',
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

function buildInsertedValue(textarea: HTMLTextAreaElement, value: string, applyMode: ApplyMode) {
  if (applyMode === 'replace') return value;

  if (applyMode === 'append') {
    const current = textarea.value || '';
    const separator = current.trim() ? '\n\n' : '';
    return `${current}${separator}${value}`;
  }

  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const prefix = before && !/\s$/.test(before) ? '\n' : '';
  const suffix = after && !/^\s/.test(after) ? '\n' : '';
  return `${before}${prefix}${value}${suffix}${after}`;
}

function getDetailedError(data: any, fallback: string) {
  if (data?.validation?.errors?.length) return data.validation.errors.join('\n');
  if (data?.limitations?.length) return data.limitations.join('\n');
  if (data?.summary) return data.summary;
  if (data?.error) return data.error;
  return fallback;
}

export default function MalliTemplateAiAssistantEnhancer() {
  const pathname = usePathname();
  const { language } = useI18n();
  const c = copy[language] ?? copy.fi;
  const enabled = isMalliPath(pathname);
  const [editorOpen, setEditorOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<AiMode>('transform_instruction');
  const [applyMode, setApplyMode] = useState<ApplyMode>('replace');
  const [instruction, setInstruction] = useState('');
  const [sampleText, setSampleText] = useState('');
  const [topic, setTopic] = useState('');
  const [allowSkeleton, setAllowSkeleton] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
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
      setStatusMessage(null);
    }
    if (!enabled) setEditorOpen(false);
  }, [enabled, editorOpen]);

  if (!enabled || !editorOpen) return null;

  const getCurrentTemplate = () => findTemplateContentTextarea()?.value || '';

  const runAi = async () => {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
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
      if (!response.ok) throw new Error(getDetailedError(data, c.failed));
      setResult(data);
      if (data?.status === 'ai_error') {
        setError(getDetailedError(data, c.failed));
      }
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

    if (applyMode === 'replace' && !window.confirm(c.replaceConfirm)) return;

    const nextValue = buildInsertedValue(textarea, result.templateText, applyMode);
    dispatchTextareaValue(textarea, nextValue);
    setStatusMessage(c.applied);
  };

  const copySuggestion = async () => {
    if (!result?.templateText) return;
    await navigator.clipboard.writeText(result.templateText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const hasValidationErrors = Boolean(result?.validation && !result.validation.ok && result.validation.errors.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="fixed right-24 top-6 z-[91] flex min-w-[250px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-blue-300/30 hover:bg-blue-700 transition-colors"
      >
        <Bot size={15} /> {c.open}
      </button>

      {dialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex h-[min(850px,calc(100vh-2rem))] w-[min(1200px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-2xl shadow-slate-900/25">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-blue-600">{c.open}</div>
                <div className="text-2xl font-black text-slate-900">{c.title}</div>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-2xl p-3 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                title={c.close}
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[400px_minmax(0,1fr)]">
              <div className="min-h-0 overflow-y-auto border-b border-slate-100 p-5 space-y-4 lg:border-b-0 lg:border-r">
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
                      className="min-h-[180px] w-full rounded-2xl bg-slate-50 p-3 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5"
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
                      className="min-h-[260px] w-full rounded-2xl bg-slate-50 p-3 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5"
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
                    <div className="rounded-2xl bg-blue-50 p-3 text-xs font-bold text-blue-800">
                      {c.sourceSearchInfo}
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

                {error && <div className="whitespace-pre-wrap rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
                {statusMessage && <div className="rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{statusMessage}</div>}

                <button
                  type="button"
                  onClick={runAi}
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {c.run}
                </button>
              </div>

              <div className="flex min-h-0 flex-col overflow-hidden p-5">
                {result?.status === 'needs_sources' && (
                  <div className="mb-3 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-700">
                    {c.needsSources}
                  </div>
                )}

                {hasValidationErrors && (
                  <div className="mb-3 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">
                    <div>{c.validationError}</div>
                    <ul className="mt-2 list-disc pl-4">
                      {result?.validation?.errors.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  </div>
                )}

                <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{c.result}</div>
                <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-5 font-mono text-sm leading-relaxed text-white">
                  {result?.templateText || c.noResult}
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-3 gap-2">
                    {(['replace', 'insert', 'append'] as ApplyMode[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setApplyMode(option)}
                        className={`rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-widest ${
                          applyMode === option ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {option === 'replace' ? c.replace : option === 'insert' ? c.insert : c.append}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2">
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
                      disabled={!result?.templateText || hasValidationErrors}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-40"
                    >
                      {c.apply}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
