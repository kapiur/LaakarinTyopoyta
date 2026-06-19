"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardCopy, FileText, Loader2, MessageSquare, MessageSquareShare } from 'lucide-react';
import { normalizeUiLanguage, type UiLanguage } from '../../../lib/i18n';
import {
  getTemplateFields,
  isTemplateFieldVisible,
  renderTemplate,
  type TemplateCategory,
  type TemplateItem,
  type TemplateValues,
} from '../../../lib/templates';
import { useI18n } from '../../../lib/useI18n';
import { recordWorkspaceActivity } from '../../../lib/dashboard/workspaceActivityClient';

const copy = {
  fi: {
    title: 'Mallin täyttö',
    subtitle: 'Input-, textarea-, select- ja showIf-kentät',
    loadFailed: 'Mallien lataus epäonnistui',
    section: 'Osio',
    template: 'Malli',
    templateFields: 'Mallin kentät',
    noInteractiveFields: 'Tässä mallissa ei ole interaktiivisia kenttiä.',
    result: 'Lopullinen teksti',
    noTemplate: 'Mallia ei ole valittu',
    copy: 'Kopioi',
    copied: 'Kopioitu',
    emptyResult: 'Valitse malli ja täytä kentät...',
    discuss: 'Keskustele tuloksesta AI:n kanssa',
  },
  ru: {
    title: 'Заполнение шаблона',
    subtitle: 'Поля input, textarea, select и showIf',
    loadFailed: 'Не удалось загрузить шаблоны',
    section: 'Раздел',
    template: 'Шаблон',
    templateFields: 'Поля шаблона',
    noInteractiveFields: 'В этом шаблоне нет интерактивных полей.',
    result: 'Итоговый текст',
    noTemplate: 'Шаблон не выбран',
    copy: 'Копировать',
    copied: 'Скопировано',
    emptyResult: 'Выбери шаблон и заполни поля...',
    discuss: 'Обсудить результат с AI',
  },
  en: {
    title: 'Template filling',
    subtitle: 'Input, textarea, select and showIf fields',
    loadFailed: 'Could not load templates',
    section: 'Section',
    template: 'Template',
    templateFields: 'Template fields',
    noInteractiveFields: 'This template has no interactive fields.',
    result: 'Final text',
    noTemplate: 'No template selected',
    copy: 'Copy',
    copied: 'Copied',
    emptyResult: 'Select a template and fill in the fields...',
    discuss: 'Discuss result with AI',
  },
  de: {
    title: 'Vorlage ausfüllen',
    subtitle: 'Input-, Textarea-, Select- und ShowIf-Felder',
    loadFailed: 'Vorlagen konnten nicht geladen werden',
    section: 'Bereich',
    template: 'Vorlage',
    templateFields: 'Vorlagenfelder',
    noInteractiveFields: 'Diese Vorlage enthält keine interaktiven Felder.',
    result: 'Endgültiger Text',
    noTemplate: 'Keine Vorlage ausgewählt',
    copy: 'Kopieren',
    copied: 'Kopiert',
    emptyResult: 'Vorlage auswählen und Felder ausfüllen...',
    discuss: 'Ergebnis mit AI besprechen',
  },
} as const;

export default function TemplateFillPage({
  embedded = false,
  initialTemplateId,
  onDiscussResult,
}: {
  embedded?: boolean;
  initialTemplateId?: number;
  onDiscussResult?: (content: string, contextLabel?: string) => void;
}) {
  const { language } = useI18n();
  const lang = normalizeUiLanguage(language);
  const c = copy[lang] ?? copy.en;
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [values, setValues] = useState<TemplateValues>({});
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/templates');
        const data = await res.json();
        const nextCategories: TemplateCategory[] = Array.isArray(data) ? data : [];
        setCategories(nextCategories);
        const preferredCategory = initialTemplateId
          ? nextCategories.find((category) => category.templates?.some((template) => template.id === initialTemplateId))
          : null;
        const nextCategory = preferredCategory || nextCategories[0] || null;
        setCategoryId(nextCategory?.id || null);
        setTemplateId(
          nextCategory?.templates?.some((template) => template.id === initialTemplateId)
            ? initialTemplateId || null
            : nextCategory?.templates?.[0]?.id || null,
        );
      } catch (err: any) {
        setErrorMsg(err.message || c.loadFailed);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [c.loadFailed, initialTemplateId]);

  const activeCategory = categories.find((category) => category.id === categoryId) || null;
  const templates = activeCategory?.templates || [];
  const selectedTemplate: TemplateItem | null = templates.find((template) => template.id === templateId) || templates[0] || null;
  const fields = selectedTemplate ? getTemplateFields(selectedTemplate.content) : [];

  useEffect(() => {
    setValues({});
    setCopied(false);
  }, [selectedTemplate?.id]);

  useEffect(() => {
    const firstTemplate = templates[0];
    if (!templates.some((template) => template.id === templateId)) {
      setTemplateId(firstTemplate?.id || null);
    }
  }, [categoryId, templateId, templates]);

  const finalText = useMemo(() => {
    if (!selectedTemplate) return '';
    return renderTemplate(selectedTemplate.content, values);
  }, [selectedTemplate, values]);

  const updateValue = (fieldId: string, value: string) => {
    setValues((current) => ({ ...current, [fieldId]: value }));
    setCopied(false);
  };

  const selectCategory = (nextCategoryId: number) => {
    const nextCategory = categories.find((category) => category.id === nextCategoryId);
    const nextTemplateId = nextCategory?.templates?.[0]?.id || null;
    setCategoryId(nextCategoryId);
    setTemplateId(nextTemplateId);
    if (nextTemplateId) recordWorkspaceActivity(`template:${nextTemplateId}`);
  };

  const selectTemplate = (nextTemplateId: number) => {
    setTemplateId(nextTemplateId);
    recordWorkspaceActivity(`template:${nextTemplateId}`);
  };

  const copyResult = async () => {
    if (!finalText) return;
    await navigator.clipboard.writeText(finalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={embedded ? "space-y-5 p-4 text-slate-900" : "max-w-7xl mx-auto p-6 space-y-6 text-slate-900"}>
      {!embedded && <div className="flex items-center justify-between bg-white border shadow-sm rounded-[2rem] p-6">
        <div className="flex items-center gap-4">
          <Link href="/templates" className="w-11 h-11 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{c.title}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.subtitle}</p>
          </div>
        </div>
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
          <MessageSquare size={22} />
        </div>
      </div>}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-20 text-blue-500">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{c.section}</label>
                  <select
                    value={categoryId || ''}
                    onChange={(event) => selectCategory(Number(event.target.value))}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{c.template}</label>
                  <select
                    value={selectedTemplate?.id || ''}
                    onChange={(event) => selectTemplate(Number(event.target.value))}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>{template.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-6">
              <div className="flex items-center gap-2 text-slate-400">
                <FileText size={15} />
                <span className="text-[10px] font-black uppercase tracking-widest">{c.templateFields}</span>
              </div>

              {fields.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-2xl text-sm text-slate-400 font-bold">
                  {c.noInteractiveFields}
                </div>
              ) : fields.map((field, index) => {
                if (!isTemplateFieldVisible(field.condition, values)) return null;

                return (
                  <div key={`${field.raw}-${index}`} className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{field.displayName}</label>

                    {field.type === 'select' ? (
                      <div className="flex flex-wrap gap-2">
                        {field.options.map((option) => (
                          <button
                            key={option}
                            onClick={() => updateValue(field.id, option)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                              values[field.id] === option
                                ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-300 hover:bg-white'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={values[field.id] || ''}
                        onChange={(event) => updateValue(field.id, event.target.value)}
                        className="w-full min-h-[150px] p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-sm transition-all shadow-inner leading-relaxed resize-y"
                      />
                    ) : (
                      <input
                        value={values[field.id] || ''}
                        onChange={(event) => updateValue(field.id, event.target.value)}
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-sm transition-all shadow-inner"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 sticky top-6">
            <div className="bg-blue-50/20 border border-blue-50 shadow-sm rounded-[2rem] overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-50 bg-white/70 p-5">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.result}</div>
                  <div className="font-black text-slate-800">{selectedTemplate?.title || c.noTemplate}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {onDiscussResult && (
                    <button type="button" onClick={() => onDiscussResult(finalText, selectedTemplate?.title)} disabled={!finalText} className="flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-40">
                      <MessageSquareShare size={15} /> {c.discuss}
                    </button>
                  )}
                  <button onClick={copyResult} disabled={!finalText} className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-bold text-emerald-600 shadow-sm ring-1 ring-emerald-100 hover:bg-emerald-50 disabled:opacity-50">
                    <ClipboardCopy size={14} />
                    {copied ? c.copied : c.copy}
                  </button>
                </div>
              </div>
              <div className="p-8 min-h-[560px] whitespace-pre-wrap text-slate-800 text-lg leading-relaxed bg-white/40">
                {finalText || <span className="text-slate-300 italic">{c.emptyResult}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
