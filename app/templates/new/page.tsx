"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FilePlus2, Loader2, Save } from 'lucide-react';
import { normalizeUiLanguage } from '../../../lib/i18n';
import type { TemplateCategory } from '../../../lib/templates';
import { useI18n } from '../../../lib/useI18n';

const copy = {
  fi: {
    title: 'Luo uusi malli',
    subtitle: 'Sisältö voidaan tuoda kenttärakentajasta',
    loadSectionsFailed: 'Osioiden lataus epäonnistui',
    required: 'Täytä mallin nimi, osio ja sisältö.',
    saveFailed: 'Tallennus epäonnistui',
    titleLabel: 'Mallin nimi',
    titlePlaceholder: 'Esimerkiksi: Kipustatus',
    sectionLabel: 'Osio',
    selectSection: 'Valitse osio',
    loadingSections: 'Ladataan osioita...',
    contentLabel: 'Mallin sisältö',
    contentPlaceholder: 'Kirjoita mallin sisältö...',
    helper:
      'Tähän voit kirjoittaa suomenkielistä lääketieteellistä tekstiä generoituja kenttiä ympäröiväksi sisällöksi. Esimerkiksi:',
    save: 'Tallenna malli',
    loadingForm: 'Ladataan lomaketta...',
  },
  ru: {
    title: 'Создать новый шаблон',
    subtitle: 'Содержимое можно передать из конструктора полей',
    loadSectionsFailed: 'Не удалось загрузить разделы',
    required: 'Заполни название, раздел и содержимое шаблона.',
    saveFailed: 'Не удалось сохранить',
    titleLabel: 'Название шаблона',
    titlePlaceholder: 'Например: Kipustatus',
    sectionLabel: 'Раздел',
    selectSection: 'Выбери раздел',
    loadingSections: 'Загружаю разделы...',
    contentLabel: 'Содержимое шаблона',
    contentPlaceholder: 'Kirjoita mallin sisältö...',
    helper:
      'Здесь можно дописать финский медицинский текст вокруг сгенерированных полей. Например:',
    save: 'Сохранить шаблон',
    loadingForm: 'Загружаю форму...',
  },
  en: {
    title: 'Create new template',
    subtitle: 'Content can be passed in from the field builder',
    loadSectionsFailed: 'Could not load sections',
    required: 'Fill in the template title, section, and content.',
    saveFailed: 'Could not save',
    titleLabel: 'Template title',
    titlePlaceholder: 'For example: Kipustatus',
    sectionLabel: 'Section',
    selectSection: 'Choose section',
    loadingSections: 'Loading sections...',
    contentLabel: 'Template content',
    contentPlaceholder: 'Kirjoita mallin sisältö...',
    helper:
      'Here you can add Finnish medical text around the generated fields. For example:',
    save: 'Save template',
    loadingForm: 'Loading form...',
  },
  de: {
    title: 'Neue Vorlage erstellen',
    subtitle: 'Inhalt kann aus dem Felder-Builder übernommen werden',
    loadSectionsFailed: 'Bereiche konnten nicht geladen werden',
    required: 'Bitte Vorlagenname, Bereich und Inhalt ausfüllen.',
    saveFailed: 'Speichern fehlgeschlagen',
    titleLabel: 'Vorlagenname',
    titlePlaceholder: 'Zum Beispiel: Kipustatus',
    sectionLabel: 'Bereich',
    selectSection: 'Bereich auswählen',
    loadingSections: 'Bereiche werden geladen...',
    contentLabel: 'Vorlageninhalt',
    contentPlaceholder: 'Vorlageninhalt eingeben...',
    helper:
      'Hier kannst du finnischen medizinischen Text um die generierten Felder herum ergänzen. Zum Beispiel:',
    save: 'Vorlage speichern',
    loadingForm: 'Formular wird geladen...',
  },
} as const;

function NewTemplateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useI18n();
  const lang = normalizeUiLanguage(language);
  const c = copy[lang] ?? copy.en;
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
        setErrorMsg(err.message || c.loadSectionsFailed);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [c.loadSectionsFailed]);

  const handleSave = async () => {
    if (!title.trim() || !categoryName.trim() || !content.trim() || saving) {
      setErrorMsg(c.required);
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
      if (!res.ok) throw new Error(data.error || c.saveFailed);
      router.push('/templates');
    } catch (err: any) {
      setErrorMsg(err.message || c.saveFailed);
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
            <h1 className="text-2xl font-black tracking-tight">{c.title}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.subtitle}</p>
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
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{c.titleLabel}</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={c.titlePlaceholder}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{c.sectionLabel}</label>
            <select
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              disabled={loadingCategories}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold disabled:opacity-50"
            >
              <option value="">{c.selectSection}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
            {loadingCategories && <div className="text-xs text-slate-400 font-semibold ml-3">{c.loadingSections}</div>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-3">{c.contentLabel}</label>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={c.contentPlaceholder}
            className="w-full min-h-[420px] p-6 bg-slate-50 border-none rounded-[2rem] outline-none focus:ring-8 focus:ring-blue-500/5 font-mono text-sm leading-relaxed"
          />
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-5 text-sm text-blue-900 font-semibold leading-relaxed">
          {c.helper}{' '}
          <code className="font-mono bg-white px-2 py-1 rounded-lg">Kipu: {'{{kipu:select:ei,kyllä}}'}.</code>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-6 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {c.save}
        </button>
      </div>
    </div>
  );
}

export default function NewTemplatePage() {
  const { language } = useI18n();
  const lang = normalizeUiLanguage(language);
  const c = copy[lang];

  return (
    <Suspense fallback={<div className="p-6 text-sm font-bold text-slate-400">{c.loadingForm}</div>}>
      <NewTemplateForm />
    </Suspense>
  );
}
