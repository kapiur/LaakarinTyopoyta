"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Loader2, MoveRight, RefreshCcw } from 'lucide-react';
import { normalizeUiLanguage, type UiLanguage } from '../../../lib/i18n';
import type { TemplateCategory } from '../../../lib/templates';
import { useI18n } from '../../../lib/useI18n';

const copy = {
  fi: {
    title: 'Siirrä tekstimalli',
    subtitle: 'Siirrä malleja osiosta toiseen',
    refresh: 'Päivitä',
    loadFailed: 'Mallien lataus epäonnistui',
    moveFailed: 'Mallin siirto epäonnistui',
    movedTo: 'Malli siirretty osioon',
    newSection: 'uuteen osioon',
    sourceSection: '1. Lähtöosio',
    templateToMove: '2. Siirrettävä malli',
    targetSection: '3. Kohdeosio',
    templatesInSection: 'mallia tässä osiossa',
    noTemplates: 'Ei malleja',
    noOtherSections: 'Ei muita osioita',
    targetPlaceholder: 'kohdeosio',
    chooseTemplate: 'Valitse siirrettävä malli.',
    moveTemplate: 'Siirrä malli',
  },
  ru: {
    title: 'Переместить шаблон',
    subtitle: 'Перенос шаблонов между разделами',
    refresh: 'Обновить',
    loadFailed: 'Не удалось загрузить шаблоны',
    moveFailed: 'Не удалось переместить шаблон',
    movedTo: 'Шаблон перемещён в раздел',
    newSection: 'новый раздел',
    sourceSection: '1. Исходный раздел',
    templateToMove: '2. Перемещаемый шаблон',
    targetSection: '3. Целевой раздел',
    templatesInSection: 'шаблонов в этом разделе',
    noTemplates: 'Шаблонов нет',
    noOtherSections: 'Других разделов нет',
    targetPlaceholder: 'целевой раздел',
    chooseTemplate: 'Выбери шаблон для переноса.',
    moveTemplate: 'Переместить шаблон',
  },
  en: {
    title: 'Move template',
    subtitle: 'Move templates between sections',
    refresh: 'Refresh',
    loadFailed: 'Could not load templates',
    moveFailed: 'Could not move template',
    movedTo: 'Template moved to section',
    newSection: 'new section',
    sourceSection: '1. Source section',
    templateToMove: '2. Template to move',
    targetSection: '3. Target section',
    templatesInSection: 'templates in this section',
    noTemplates: 'No templates',
    noOtherSections: 'No other sections',
    targetPlaceholder: 'target section',
    chooseTemplate: 'Select a template to move.',
    moveTemplate: 'Move template',
  },
  de: {
    title: 'Vorlage verschieben',
    subtitle: 'Vorlagen zwischen Bereichen verschieben',
    refresh: 'Aktualisieren',
    loadFailed: 'Vorlagen konnten nicht geladen werden',
    moveFailed: 'Vorlage konnte nicht verschoben werden',
    movedTo: 'Vorlage verschoben nach Bereich',
    newSection: 'neuer Bereich',
    sourceSection: '1. Ausgangsbereich',
    templateToMove: '2. Zu verschiebende Vorlage',
    targetSection: '3. Zielbereich',
    templatesInSection: 'Vorlagen in diesem Bereich',
    noTemplates: 'Keine Vorlagen',
    noOtherSections: 'Keine anderen Bereiche',
    targetPlaceholder: 'Zielbereich',
    chooseTemplate: 'Vorlage zum Verschieben auswählen.',
    moveTemplate: 'Vorlage verschieben',
  },
} as const;

export default function MoveTemplatesPage() {
  const { language } = useI18n();
  const lang = normalizeUiLanguage(language);
  const c = copy[lang] ?? copy.en;
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sourceCategoryId, setSourceCategoryId] = useState<number | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState<number | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      const nextCategories: TemplateCategory[] = Array.isArray(data) ? data : [];
      setCategories(nextCategories);

      if (nextCategories.length > 0) {
        const currentSourceExists = nextCategories.some((category) => category.id === sourceCategoryId);
        const nextSourceId = currentSourceExists ? sourceCategoryId : nextCategories[0].id;
        setSourceCategoryId(nextSourceId ?? null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || c.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const sourceCategory = categories.find((category) => category.id === sourceCategoryId) || null;
  const selectedTemplate = sourceCategory?.templates?.find((template) => template.id === templateId) || null;
  const targetCategories = categories.filter((category) => category.id !== sourceCategoryId);

  const availableTemplates = useMemo(() => {
    return sourceCategory?.templates || [];
  }, [sourceCategory]);

  useEffect(() => {
    const firstTemplate = availableTemplates[0];
    setTemplateId(firstTemplate?.id || null);
  }, [sourceCategoryId, availableTemplates.length]);

  useEffect(() => {
    const firstTarget = targetCategories[0];
    setTargetCategoryId(firstTarget?.id || null);
  }, [sourceCategoryId, categories.length]);

  const handleMove = async () => {
    if (!templateId || !targetCategoryId || moving) return;

    setMoving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/templates/move', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, categoryId: targetCategoryId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.moveFailed);

      const targetName = categories.find((category) => category.id === targetCategoryId)?.name || c.newSection;
      setSuccessMsg(`${c.movedTo}: ${targetName}`);
      setTemplateId(null);
      await fetchTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || c.moveFailed);
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 text-slate-900">
      <div className="flex items-center justify-between bg-white border shadow-sm rounded-[2rem] p-6">
        <div className="flex items-center gap-4">
          <Link href="/templates" className="w-11 h-11 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{c.title}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.subtitle}</p>
          </div>
        </div>
        <button
          onClick={fetchTemplates}
          disabled={loading || moving}
          className="px-5 py-3 rounded-xl border border-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          {c.refresh}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm font-bold text-emerald-700">
          {successMsg}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-5">
        <div className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.sourceSection}</div>
          <select
            className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
            value={sourceCategoryId || ''}
            onChange={(event) => setSourceCategoryId(Number(event.target.value))}
            disabled={loading || moving}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <div className="text-xs text-slate-400 font-bold">
            {availableTemplates.length} {c.templatesInSection}
          </div>
        </div>

        <div className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.templateToMove}</div>
          <select
            className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
            value={templateId || ''}
            onChange={(event) => setTemplateId(Number(event.target.value))}
            disabled={loading || moving || availableTemplates.length === 0}
          >
            {availableTemplates.length === 0 ? (
              <option value="">{c.noTemplates}</option>
            ) : availableTemplates.map((template) => (
              <option key={template.id} value={template.id}>{template.title}</option>
            ))}
          </select>
          {selectedTemplate && (
            <div className="text-xs text-slate-400 font-bold line-clamp-3">
              {selectedTemplate.content.slice(0, 160)}
            </div>
          )}
        </div>

        <div className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.targetSection}</div>
          <select
            className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
            value={targetCategoryId || ''}
            onChange={(event) => setTargetCategoryId(Number(event.target.value))}
            disabled={loading || moving || targetCategories.length === 0}
          >
            {targetCategories.length === 0 ? (
              <option value="">{c.noOtherSections}</option>
            ) : targetCategories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border shadow-sm rounded-[2rem] p-6 flex items-center justify-between gap-4">
        <div className="text-sm text-slate-500 font-bold">
          {selectedTemplate ? (
            <span>
              <span className="text-slate-900">{selectedTemplate.title}</span>
              <ChevronRight size={14} className="inline mx-2" />
              <span className="text-slate-900">{categories.find((category) => category.id === targetCategoryId)?.name || c.targetPlaceholder}</span>
            </span>
          ) : c.chooseTemplate}
        </div>
        <button
          onClick={handleMove}
          disabled={moving || !templateId || !targetCategoryId}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-100"
        >
          {moving ? <Loader2 size={14} className="animate-spin" /> : <MoveRight size={14} />}
          {c.moveTemplate}
        </button>
      </div>
    </div>
  );
}
