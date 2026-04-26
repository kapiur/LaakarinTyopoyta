"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Loader2, MoveRight, RefreshCcw } from 'lucide-react';
import type { TemplateCategory, TemplateItem } from '../../../lib/templates';

export default function MoveTemplatesPage() {
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
      setErrorMsg(err.message || 'Mallien lataus epäonnistui');
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
  }, [sourceCategoryId]);

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
      if (!res.ok) throw new Error(data.error || 'Mallin siirto epäonnistui');

      const targetName = categories.find((category) => category.id === targetCategoryId)?.name || 'uuteen osioon';
      setSuccessMsg(`Malli siirretty osioon: ${targetName}`);
      setTemplateId(null);
      await fetchTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || 'Mallin siirto epäonnistui');
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
            <h1 className="text-2xl font-black tracking-tight">Siirrä tekstimalli</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mallien siirto osiosta toiseen</p>
          </div>
        </div>
        <button
          onClick={fetchTemplates}
          disabled={loading || moving}
          className="px-5 py-3 rounded-xl border border-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Päivitä
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
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Lähtöosio</div>
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
            {availableTemplates.length} mallia tässä osiossa
          </div>
        </div>

        <div className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Siirrettävä malli</div>
          <select
            className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
            value={templateId || ''}
            onChange={(event) => setTemplateId(Number(event.target.value))}
            disabled={loading || moving || availableTemplates.length === 0}
          >
            {availableTemplates.length === 0 ? (
              <option value="">Ei malleja</option>
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
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Kohdeosio</div>
          <select
            className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
            value={targetCategoryId || ''}
            onChange={(event) => setTargetCategoryId(Number(event.target.value))}
            disabled={loading || moving || targetCategories.length === 0}
          >
            {targetCategories.length === 0 ? (
              <option value="">Ei muita osioita</option>
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
              Siirretään <span className="text-slate-900">{selectedTemplate.title}</span>
              <ChevronRight size={14} className="inline mx-2" />
              <span className="text-slate-900">{categories.find((category) => category.id === targetCategoryId)?.name || 'kohdeosio'}</span>
            </span>
          ) : 'Valitse siirrettävä malli.'}
        </div>
        <button
          onClick={handleMove}
          disabled={moving || !templateId || !targetCategoryId}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-100"
        >
          {moving ? <Loader2 size={14} className="animate-spin" /> : <MoveRight size={14} />}
          Siirrä malli
        </button>
      </div>
    </div>
  );
}
