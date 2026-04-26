"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FilePlus2, Loader2, Save } from 'lucide-react';
import type { TemplateCategory } from '../../../lib/templates';

function NewTemplateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialContent = useMemo(() => searchParams.get('content') || '', [searchParams]);

  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await fetch('/api/templates');
        const data = await res.json();
        const nextCategories: TemplateCategory[] = Array.isArray(data) ? data : [];
        setCategories(nextCategories);
      } catch (err: any) {
        setErrorMsg(err.message || 'Osioiden lataus epäonnistui');
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !categoryName.trim() || !content.trim() || saving) {
      setErrorMsg('Заполни название, раздел и содержимое шаблона.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          categoryName,
          content,
          author: 'Doc',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tallennus epäonnistui');
      router.push('/templates');
    } catch (err: any) {
      setErrorMsg(err.message || 'Tallennus epäonnistui');
    } finally {
      setSaving(false);
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
            <h1 className="text-2xl font-black tracking-tight">Создать новый шаблон</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Содержимое может быть передано из конструктора полей</p>
          </div>
        </div>
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
          <FilePlus2 size={22} />
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="bg-white border shadow-sm rounded-[2rem] p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Название шаблона</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: Kipustatus"
              className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Раздел</label>
            <select
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              disabled={loadingCategories}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold disabled:opacity-50"
            >
              <option value="">Выбери раздел</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
            {loadingCategories && <div className="text-xs text-slate-400 font-semibold ml-3">Загружаю разделы...</div>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-3">Содержимое шаблона</label>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Kirjoita mallin sisältö..."
            className="w-full min-h-[420px] p-6 bg-slate-50 border-none rounded-[2rem] outline-none focus:ring-8 focus:ring-blue-500/5 font-mono text-sm leading-relaxed"
          />
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-5 text-sm text-blue-900 font-semibold leading-relaxed">
          Здесь можно дописать финский медицинский текст вокруг сгенерированных полей. Например: <code className="font-mono bg-white px-2 py-1 rounded-lg">Kipu: {'{{kipu:select:ei,kyllä}}'}.</code>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-6 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Сохранить шаблон
        </button>
      </div>
    </div>
  );
}

export default function NewTemplatePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm font-bold text-slate-400">Загружаю форму...</div>}>
      <NewTemplateForm />
    </Suspense>
  );
}
