"use client";

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CheckCircle2, ListChecks, X, AlertTriangle } from 'lucide-react';
import { validateTemplate, type TemplateValidationResult } from '../lib/templates';
import { useI18n } from '../lib/useI18n';

const copy = {
  fi: {
    check: 'Tarkista malli',
    title: 'Mallin tarkistus',
    ok: 'Syntaksi näyttää hyvältä.',
    errors: 'Virheet',
    warnings: 'Varoitukset',
    noEditor: 'Avaa ensin mallin editori.',
    fields: 'kenttää',
    close: 'Sulje',
  },
  ru: {
    check: 'Проверить шаблон',
    title: 'Проверка шаблона',
    ok: 'Синтаксис выглядит корректным.',
    errors: 'Ошибки',
    warnings: 'Предупреждения',
    noEditor: 'Сначала откройте редактор шаблона.',
    fields: 'полей',
    close: 'Закрыть',
  },
  en: {
    check: 'Check template',
    title: 'Template check',
    ok: 'Syntax looks good.',
    errors: 'Errors',
    warnings: 'Warnings',
    noEditor: 'Open the template editor first.',
    fields: 'fields',
    close: 'Close',
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

export default function MalliTemplateValidatorEnhancer() {
  const pathname = usePathname();
  const { language } = useI18n();
  const c = copy[language] ?? copy.fi;
  const enabled = isMalliPath(pathname);
  const [editorOpen, setEditorOpen] = useState(false);
  const [result, setResult] = useState<TemplateValidationResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

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
      setResult(null);
      setMessage(null);
      setPanelOpen(false);
    }
    if (!enabled) setEditorOpen(false);
  }, [enabled, editorOpen]);

  const status = useMemo(() => {
    if (!result) return 'idle';
    if (result.errors.length > 0) return 'error';
    if (result.warnings.length > 0) return 'warning';
    return 'ok';
  }, [result]);

  if (!enabled || !editorOpen) return null;

  const handleCheck = () => {
    const textarea = findTemplateContentTextarea();
    if (!textarea) {
      setMessage(c.noEditor);
      setResult(null);
      setPanelOpen(true);
      return;
    }

    const validation = validateTemplate(textarea.value || '');
    setResult(validation);
    setMessage(null);
    setPanelOpen(true);
  };

  return (
    <div className="fixed top-24 right-24 z-[90] flex flex-col items-end gap-3">
      {panelOpen && (
        <div className="w-[380px] max-w-[calc(100vw-2rem)] rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/40">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.title}</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-black text-slate-800">
                {status === 'ok' ? <CheckCircle2 size={17} className="text-emerald-600" /> : null}
                {status === 'warning' ? <AlertTriangle size={17} className="text-amber-500" /> : null}
                {status === 'error' ? <AlertTriangle size={17} className="text-red-500" /> : null}
                {result ? `${result.fields.length} ${c.fields}` : message || c.noEditor}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              title={c.close}
            >
              <X size={16} />
            </button>
          </div>

          {result && result.ok && result.warnings.length === 0 && (
            <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
              {c.ok}
            </div>
          )}

          {result && result.errors.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-red-500">{c.errors}</div>
              {result.errors.map((issue, index) => (
                <div key={`error-${index}`} className="rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">
                  {issue.fieldId ? <span className="font-black">{issue.fieldId}: </span> : null}
                  {issue.message}
                </div>
              ))}
            </div>
          )}

          {result && result.warnings.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">{c.warnings}</div>
              {result.warnings.map((issue, index) => (
                <div key={`warning-${index}`} className="rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-700">
                  {issue.fieldId ? <span className="font-black">{issue.fieldId}: </span> : null}
                  {issue.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleCheck}
        className="flex min-w-[250px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-slate-300/30 hover:bg-blue-700 transition-colors"
      >
        <ListChecks size={15} /> {c.check}
      </button>
    </div>
  );
}
