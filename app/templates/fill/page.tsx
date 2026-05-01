"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardCopy, FileText, Loader2, MessageSquare } from 'lucide-react';
import {
  getTemplateFields,
  isTemplateFieldVisible,
  renderTemplate,
  type TemplateCategory,
  type TemplateItem,
  type TemplateValues,
} from '../../../lib/templates';

export default function TemplateFillPage() {
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
        if (nextCategories[0]?.id) setCategoryId(nextCategories[0].id);
      } catch (err: any) {
        setErrorMsg(err.message || 'Mallien lataus epäonnistui');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

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
    setTemplateId(firstTemplate?.id || null);
  }, [categoryId, templates.length]);

  const finalText = useMemo(() => {
    if (!selectedTemplate) return '';
    return renderTemplate(selectedTemplate.content, values);
  }, [selectedTemplate, values]);

  const updateValue = (fieldId: string, value: string) => {
    setValues((current) => ({ ...current, [fieldId]: value }));
    setCopied(false);
  };

  const copyResult = async () => {
    if (!finalText) return;
    await navigator.clipboard.writeText(finalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 text-slate-900">
      <div className="flex items-center justify-between bg-white border shadow-sm rounded-[2rem] p-6">
        <div className="flex items-center gap-4">
          <Link href="/templates" className="w-11 h-11 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Заполнение шаблона</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">input, textarea, select и showIf</p>
          </div>
        </div>
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
          <MessageSquare size={22} />
        </div>
      </div>

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
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Раздел</label>
                  <select
                    value={categoryId || ''}
                    onChange={(event) => setCategoryId(Number(event.target.value))}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Шаблон</label>
                  <select
                    value={selectedTemplate?.id || ''}
                    onChange={(event) => setTemplateId(Number(event.target.value))}
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
                <span className="text-[10px] font-black uppercase tracking-widest">Поля шаблона</span>
              </div>

              {fields.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-2xl text-sm text-slate-400 font-bold">
                  В этом шаблоне нет интерактивных полей.
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
              <div className="p-5 bg-white/70 border-b border-blue-50 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Итоговый текст</div>
                  <div className="font-black text-slate-800">{selectedTemplate?.title || 'Шаблон не выбран'}</div>
                </div>
                <button
                  onClick={copyResult}
                  disabled={!finalText}
                  className="px-5 py-3 bg-white text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ring-1 ring-emerald-100 hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-2"
                >
                  <ClipboardCopy size={14} />
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
              </div>
              <div className="p-8 min-h-[560px] whitespace-pre-wrap text-slate-800 text-lg leading-relaxed bg-white/40">
                {finalText || <span className="text-slate-300 italic">Выбери шаблон и заполни поля...</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
