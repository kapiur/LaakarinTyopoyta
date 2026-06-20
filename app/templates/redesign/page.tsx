"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardCopy,
  Edit2,
  FileText,
  HelpCircle,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  getTemplateFields,
  isTemplateFieldVisible,
  renderTemplate,
  type TemplateCategory,
  type TemplateFormData,
  type TemplateItem,
  type TemplateValues,
} from '../../../lib/templates';
import TemplateFieldControl from '../../../components/templates/TemplateFieldControl';
import TemplateSnippetBuilder from '../../../components/templates/TemplateSnippetBuilder';
import TemplateAiPolishModal from '../../../components/templates/TemplateAiPolishModal';
import { recordWorkspaceActivity } from '../../../lib/dashboard/workspaceActivityClient';
import { useI18n } from '../../../lib/useI18n';

const emptyForm: TemplateFormData = {
  id: null,
  title: '',
  content: '',
  categoryName: '',
  author: 'Doc',
};

const malliCopy = {
  fi: {
    pageTitle: 'Tekstimallit',
    pageSubtitle: 'Yksi työtila mallien käyttöön',
    syntaxHelp: 'Syntaksiohje',
    sections: 'Osiot',
    manageSections: 'Hallinnoi osioita',
    newTemplate: 'Uusi malli',
    searchPlaceholder: 'Etsi mallia...',
    noTemplates: 'Ei malleja',
    fillFields: 'Täytä kentät',
    selectTemplate: 'Valitse malli',
    noInteractiveFields: 'Tässä mallissa ei ole interaktiivisia kenttiä.',
    result: 'Tulos',
    noTemplate: 'Ei mallia',
    aiPolish: 'AI-hionta',
    copy: 'Kopioi',
    copied: 'Kopioitu',
    emptyResult: 'Valitse malli ja täytä kentät...',
    editTemplate: 'Muokkaa mallia',
    unnamedTemplate: 'Nimetön malli',
    titleLabel: 'Mallin otsikko',
    sectionLabel: 'Osio / siirrä osioon',
    selectSection: 'Valitse osio',
    contentLabel: 'Sisältö ja muuttujat',
    help: 'Ohje',
    contentPlaceholder: 'Kirjoita mallin sisältö... esim. Kipu: {{kipu:select:ei,kyllä}}',
    delete: 'Poista',
    cancel: 'Peruuta',
    save: 'Tallenna',
    requiredFields: 'Täytä otsikko, osio ja sisältö.',
    loadFailed: 'Mallien lataus epäonnistui',
    saveFailed: 'Tallennus epäonnistui',
    deleteFailed: 'Poisto epäonnistui',
    deleteTemplateConfirm: 'Haluatko varmasti poistaa mallin',
    syntaxTitle: 'Syntaksin pikamuistio',
    syntaxText: 'Tekninen kentän nimi kirjoitetaan latinalla ilman välilyöntejä. Varsinainen lääketieteellinen teksti jää suomeksi.',
    newSectionName: 'Uuden osion nimi',
    create: 'Luo',
    noSections: 'Ei osioita',
    templatesCount: 'mallia',
    createSectionFailed: 'Osion luonti epäonnistui',
    updateSectionFailed: 'Osion päivitys epäonnistui',
    deleteSectionFailed: 'Osion poisto epäonnistui',
    deleteSectionConfirm: 'Haluatko varmasti poistaa osion',
    deleteSectionWithTemplates: 'ja sen mallit? Tätä ei voi perua.',
  },
  ru: {
    pageTitle: 'Текстовые шаблоны',
    pageSubtitle: 'Единое рабочее пространство для шаблонов',
    syntaxHelp: 'Справка по синтаксису',
    sections: 'Разделы',
    manageSections: 'Управление разделами',
    newTemplate: 'Новый шаблон',
    searchPlaceholder: 'Искать шаблон...',
    noTemplates: 'Шаблонов нет',
    fillFields: 'Заполните поля',
    selectTemplate: 'Выберите шаблон',
    noInteractiveFields: 'В этом шаблоне нет интерактивных полей.',
    result: 'Результат',
    noTemplate: 'Шаблон не выбран',
    aiPolish: 'AI-коррекция',
    copy: 'Копировать',
    copied: 'Скопировано',
    emptyResult: 'Выберите шаблон и заполните поля...',
    editTemplate: 'Редактировать шаблон',
    unnamedTemplate: 'Без названия',
    titleLabel: 'Название шаблона',
    sectionLabel: 'Раздел / переместить в раздел',
    selectSection: 'Выберите раздел',
    contentLabel: 'Содержание и переменные',
    help: 'Справка',
    contentPlaceholder: 'Напишите содержание шаблона... например: Kipu: {{kipu:select:ei,kyllä}}',
    delete: 'Удалить',
    cancel: 'Отмена',
    save: 'Сохранить',
    requiredFields: 'Заполните название, раздел и содержание.',
    loadFailed: 'Не удалось загрузить шаблоны',
    saveFailed: 'Не удалось сохранить',
    deleteFailed: 'Не удалось удалить',
    deleteTemplateConfirm: 'Вы действительно хотите удалить шаблон',
    syntaxTitle: 'Краткая памятка по синтаксису',
    syntaxText: 'Техническое имя поля пишется латиницей без пробелов. Сам медицинский текст остаётся на финском языке.',
    newSectionName: 'Название нового раздела',
    create: 'Создать',
    noSections: 'Разделов нет',
    templatesCount: 'шаблонов',
    createSectionFailed: 'Не удалось создать раздел',
    updateSectionFailed: 'Не удалось обновить раздел',
    deleteSectionFailed: 'Не удалось удалить раздел',
    deleteSectionConfirm: 'Вы действительно хотите удалить раздел',
    deleteSectionWithTemplates: 'и все шаблоны в нём? Это действие нельзя отменить.',
  },
  en: {
    pageTitle: 'Text templates',
    pageSubtitle: 'One workspace for using templates',
    syntaxHelp: 'Syntax help',
    sections: 'Sections',
    manageSections: 'Manage sections',
    newTemplate: 'New template',
    searchPlaceholder: 'Search template...',
    noTemplates: 'No templates',
    fillFields: 'Fill in fields',
    selectTemplate: 'Select template',
    noInteractiveFields: 'This template has no interactive fields.',
    result: 'Result',
    noTemplate: 'No template selected',
    aiPolish: 'AI polish',
    copy: 'Copy',
    copied: 'Copied',
    emptyResult: 'Select a template and fill in fields...',
    editTemplate: 'Edit template',
    unnamedTemplate: 'Untitled template',
    titleLabel: 'Template title',
    sectionLabel: 'Section / move to section',
    selectSection: 'Select section',
    contentLabel: 'Content and variables',
    help: 'Help',
    contentPlaceholder: 'Write template content... for example: Kipu: {{kipu:select:ei,kyllä}}',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    requiredFields: 'Fill in title, section and content.',
    loadFailed: 'Could not load templates',
    saveFailed: 'Could not save',
    deleteFailed: 'Could not delete',
    deleteTemplateConfirm: 'Do you really want to delete template',
    syntaxTitle: 'Syntax quick reference',
    syntaxText: 'The technical field name is written in Latin characters without spaces. The actual medical text remains in Finnish.',
    newSectionName: 'New section name',
    create: 'Create',
    noSections: 'No sections',
    templatesCount: 'templates',
    createSectionFailed: 'Could not create section',
    updateSectionFailed: 'Could not update section',
    deleteSectionFailed: 'Could not delete section',
    deleteSectionConfirm: 'Do you really want to delete section',
    deleteSectionWithTemplates: 'and all templates in it? This cannot be undone.',
  },
} as const;

type UiLanguage = keyof typeof malliCopy;

export default function TemplatesRedesignPage() {
  const { language } = useI18n();
  const uiLanguage: UiLanguage = language === 'ru' || language === 'en' || language === 'fi' ? language : 'fi';
  const c = malliCopy[uiLanguage];
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [values, setValues] = useState<TemplateValues>({});
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [showAiPolish, setShowAiPolish] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [sectionActionLoading, setSectionActionLoading] = useState(false);

  const activeCategory = categories.find((category) => category.id === activeCategoryId) || null;
  const templates = activeCategory?.templates || [];
  const filteredTemplates = templates.filter((template) =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedTemplate: TemplateItem | null = templates.find((template) => template.id === selectedTemplateId) || null;
  const fields = selectedTemplate ? getTemplateFields(selectedTemplate.content) : [];

  const loadTemplates = async (preferredTemplateId?: number | null) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      const nextCategories: TemplateCategory[] = Array.isArray(data) ? data : [];
      setCategories(nextCategories);

      const preferredCategory = preferredTemplateId
        ? nextCategories.find((category) => category.templates?.some((template) => template.id === preferredTemplateId))
        : null;
      const currentCategory = nextCategories.find((category) => category.id === activeCategoryId);
      const firstCategory = preferredCategory || currentCategory || nextCategories[0] || null;

      if (!firstCategory) {
        setActiveCategoryId(null);
        setSelectedTemplateId(null);
        return;
      }

      setActiveCategoryId(firstCategory.id);
      const nextTemplates = firstCategory.templates || [];
      const preferredExists = nextTemplates.some((template) => template.id === preferredTemplateId);
      setSelectedTemplateId(preferredExists ? preferredTemplateId || null : nextTemplates[0]?.id || null);
    } catch (err: any) {
      setErrorMsg(err.message || c.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const requestedTemplateId = Number(new URLSearchParams(window.location.search).get('templateId'));
    loadTemplates(Number.isFinite(requestedTemplateId) && requestedTemplateId > 0 ? requestedTemplateId : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setValues({});
    setCopied(false);
  }, [selectedTemplate?.id]);

  const finalText = useMemo(() => {
    if (!selectedTemplate) return '';
    return renderTemplate(selectedTemplate.content, values);
  }, [selectedTemplate, values]);

  const updateValue = (fieldId: string, value: string) => {
    setValues((current) => ({ ...current, [fieldId]: value }));
    setCopied(false);
  };

  const handleCategorySelect = (category: TemplateCategory) => {
    setActiveCategoryId(category.id);
    setSelectedTemplateId(category.templates?.[0]?.id || null);
    setSearchTerm('');
  };

  const copyResult = async () => {
    if (!finalText) return;
    await navigator.clipboard.writeText(finalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const openNewTemplate = () => {
    setFormData({ ...emptyForm, categoryName: activeCategory?.name || '' });
    setShowEditor(true);
  };

  const openEditTemplate = () => {
    if (!selectedTemplate) return;
    setFormData({
      id: selectedTemplate.id,
      title: selectedTemplate.title,
      content: selectedTemplate.content,
      categoryName: categories.find((category) => category.id === selectedTemplate.categoryId)?.name || activeCategory?.name || '',
      author: selectedTemplate.author || 'Doc',
    });
    setShowEditor(true);
  };

  const applyAiPolishSuggestion = (templateText: string) => {
    if (!selectedTemplate) return;
    setFormData({
      id: selectedTemplate.id,
      title: selectedTemplate.title,
      content: templateText,
      categoryName: categories.find((category) => category.id === selectedTemplate.categoryId)?.name || activeCategory?.name || '',
      author: selectedTemplate.author || 'Doc',
    });
    setShowAiPolish(false);
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setFormData(emptyForm);
    setSaving(false);
  };

  const insertSnippet = (snippet: string) => {
    setFormData((current) => ({
      ...current,
      content: current.content ? `${current.content}\n${snippet}` : snippet,
    }));
  };

  const saveTemplate = async () => {
    if (saving) return;
    if (!formData.title.trim() || !formData.categoryName.trim() || !formData.content.trim()) {
      setErrorMsg(c.requiredFields);
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const method = formData.id ? 'PUT' : 'POST';
      const res = await fetch('/api/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.saveFailed);

      const savedId = data.id || formData.id || null;
      closeEditor();
      await loadTemplates(savedId);
    } catch (err: any) {
      setErrorMsg(err.message || c.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async () => {
    if (!formData.id || saving) return;
    if (!confirm(`${c.deleteTemplateConfirm} "${formData.title}"?`)) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/templates?id=${formData.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || c.deleteFailed);
      }
      closeEditor();
      await loadTemplates(null);
    } catch (err: any) {
      setErrorMsg(err.message || c.deleteFailed);
    } finally {
      setSaving(false);
    }
  };

  const createSection = async () => {
    if (!newSectionName.trim() || sectionActionLoading) return;
    setSectionActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/templates/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSectionName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.createSectionFailed);
      setNewSectionName('');
      setActiveCategoryId(data.id);
      await loadTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || c.createSectionFailed);
    } finally {
      setSectionActionLoading(false);
    }
  };

  const startEditSection = (category: TemplateCategory) => {
    setEditingSectionId(category.id);
    setEditingSectionName(category.name);
  };

  const cancelEditSection = () => {
    setEditingSectionId(null);
    setEditingSectionName('');
  };

  const renameSection = async () => {
    if (!editingSectionId || !editingSectionName.trim() || sectionActionLoading) return;
    setSectionActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/templates/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingSectionId, name: editingSectionName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.updateSectionFailed);
      cancelEditSection();
      await loadTemplates(selectedTemplateId);
    } catch (err: any) {
      setErrorMsg(err.message || c.updateSectionFailed);
    } finally {
      setSectionActionLoading(false);
    }
  };

  const deleteSection = async (category: TemplateCategory) => {
    const templateCount = category.templates?.length || 0;
    const message = templateCount > 0
      ? `${c.deleteSectionConfirm} "${category.name}" ${c.deleteSectionWithTemplates}`
      : `${c.deleteSectionConfirm} "${category.name}"?`;

    if (!confirm(message) || sectionActionLoading) return;
    setSectionActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/templates/categories?id=${category.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.deleteSectionFailed);
      if (activeCategoryId === category.id) setActiveCategoryId(null);
      if (selectedTemplate?.categoryId === category.id) setSelectedTemplateId(null);
      await loadTemplates(null);
    } catch (err: any) {
      setErrorMsg(err.message || c.deleteSectionFailed);
    } finally {
      setSectionActionLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-[calc(100dvh-5rem)] max-w-[1800px] space-y-4 p-0 text-slate-900 sm:p-2 lg:space-y-5 lg:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-3 shadow-sm sm:p-5 lg:rounded-[2rem]">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link href="/" className="w-11 h-11 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <FileText size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black tracking-tight sm:text-2xl">{c.pageTitle}</h1>
            <p className="hidden text-[10px] font-black uppercase tracking-widest text-slate-400 sm:block">{c.pageSubtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => setShowHelp(true)} className="w-11 h-11 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors" title={c.syntaxHelp}>
            <HelpCircle size={18} />
          </button>
          <button type="button" onClick={() => setShowSectionManager(true)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-500 transition-colors hover:bg-slate-50 sm:w-auto sm:px-5" title={c.sections}>
            <Settings size={14} /> <span className="ml-2 hidden text-[10px] font-black uppercase tracking-widest sm:inline">{c.sections}</span>
          </button>
          <button type="button" onClick={openNewTemplate} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100 transition-colors hover:bg-blue-700 sm:w-auto sm:px-5" title={c.newTemplate}>
            <Plus size={14} /> <span className="ml-2 hidden text-[10px] font-black uppercase tracking-widest sm:inline">{c.newTemplate}</span>
          </button>
        </div>
      </header>

      {errorMsg && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">{errorMsg}</div>}

      {loading ? (
        <div className="h-[60vh] flex items-center justify-center text-blue-500"><Loader2 className="animate-spin" /></div>
      ) : (
        <main className="grid min-h-0 grid-cols-1 gap-4 lg:min-h-[calc(100vh-220px)] lg:grid-cols-12 lg:gap-5">
          <aside className="col-span-1 flex max-h-[34rem] flex-col overflow-hidden rounded-2xl border bg-white shadow-sm lg:col-span-3 lg:max-h-none lg:rounded-[2rem]">
            <div className="p-5 border-b border-slate-100">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{c.sections}</div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button key={category.id} type="button" onClick={() => handleCategorySelect(category)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategoryId === category.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`}>
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={c.searchPlaceholder} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
              {filteredTemplates.length === 0 ? (
                <div className="p-6 text-sm text-slate-300 font-bold text-center">{c.noTemplates}</div>
              ) : filteredTemplates.map((template) => (
                <button key={template.id} type="button" onClick={() => { setSelectedTemplateId(template.id); recordWorkspaceActivity(`template:${template.id}`); }} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedTemplateId === template.id ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' : 'bg-white border-slate-50 hover:border-blue-200 hover:bg-blue-50/30'}`}>
                  <div className="font-black text-sm truncate">{template.title}</div>
                  <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${selectedTemplateId === template.id ? 'text-white/40' : 'text-slate-300'}`}>{activeCategory?.name || c.sections}</div>
                </button>
              ))}
            </div>
          </aside>

          <section className="col-span-1 flex min-h-[24rem] flex-col overflow-hidden rounded-2xl border bg-white shadow-sm lg:col-span-4 lg:rounded-[2rem]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.fillFields}</div>
                <div className="font-black text-slate-800">{selectedTemplate?.title || c.selectTemplate}</div>
              </div>
              <div className="flex items-center gap-2">
                {selectedTemplate && <button type="button" onClick={openEditTemplate} className="p-2.5 text-slate-400 hover:text-blue-600 transition-all bg-white rounded-xl border border-slate-100 shadow-sm" title={c.editTemplate}><Edit2 size={16} /></button>}
                <MessageSquare className="text-slate-300" size={18} />
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6 no-scrollbar">
              {!selectedTemplate ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-4"><FileText size={46} strokeWidth={1} /><div className="text-[10px] font-black uppercase tracking-widest">{c.selectTemplate}</div></div>
              ) : fields.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-2xl text-sm text-slate-400 font-bold">{c.noInteractiveFields}</div>
              ) : fields.map((field, index) => {
                if (!isTemplateFieldVisible(field.condition, values)) return null;
                return (
                  <div key={`${field.raw}-${index}`} className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{field.displayName}</label>
                    <TemplateFieldControl field={field} values={values} onChange={updateValue} />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="col-span-1 flex min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-blue-50 bg-blue-50/20 shadow-sm lg:col-span-5 lg:rounded-[2rem]">
            <div className="p-5 border-b border-blue-50 bg-white/70 flex items-center justify-between">
              <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.result}</div><div className="font-black text-slate-800">{selectedTemplate?.title || c.noTemplate}</div></div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => selectedTemplate && setShowAiPolish(true)} disabled={!selectedTemplate} className="px-4 py-2.5 rounded-xl bg-white text-blue-600 ring-1 ring-blue-100 text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 disabled:opacity-40 flex items-center gap-2"><Sparkles size={13} /> {c.aiPolish}</button>
                <button type="button" onClick={copyResult} disabled={!finalText} className="px-4 py-2.5 rounded-xl bg-white text-emerald-600 ring-1 ring-emerald-100 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-2"><ClipboardCopy size={13} /> {copied ? c.copied : c.copy}</button>
              </div>
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto whitespace-pre-wrap bg-white/30 p-5 text-base leading-relaxed text-slate-800 sm:p-8 sm:text-lg">{finalText || <span className="text-slate-300 italic">{c.emptyResult}</span>}</div>
          </section>
        </main>
      )}

      {showEditor && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-3xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right-6">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formData.id ? c.editTemplate : c.newTemplate}</div><h2 className="text-2xl font-black text-slate-900">{formData.title || c.unnamedTemplate}</h2></div>
              <button onClick={closeEditor} className="p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{c.titleLabel}</label><input value={formData.title} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold shadow-inner" /></div>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{c.sectionLabel}</label><select value={formData.categoryName} onChange={(event) => setFormData((current) => ({ ...current, categoryName: event.target.value }))} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold shadow-inner"><option value="">{c.selectSection}</option>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></div>
              </div>

              <TemplateSnippetBuilder onInsert={insertSnippet} />

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-3"><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{c.contentLabel}</label><button type="button" onClick={() => setShowHelp(true)} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center gap-1"><HelpCircle size={12} /> {c.help}</button></div>
                <textarea value={formData.content} onChange={(event) => setFormData((current) => ({ ...current, content: event.target.value }))} className="w-full min-h-[480px] p-6 bg-slate-50 border-none rounded-[2rem] outline-none focus:bg-white focus:ring-8 focus:ring-blue-500/5 font-mono text-sm leading-relaxed shadow-inner" placeholder={c.contentPlaceholder} />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex items-center justify-between gap-3">
              <button type="button" onClick={deleteTemplate} disabled={!formData.id || saving} className="px-5 py-3 rounded-2xl bg-white text-red-500 ring-1 ring-red-100 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 disabled:opacity-30 flex items-center gap-2"><Trash2 size={14} /> {c.delete}</button>
              <div className="flex items-center gap-3"><button type="button" onClick={closeEditor} className="px-5 py-3 rounded-2xl bg-white text-slate-500 ring-1 ring-slate-100 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">{c.cancel}</button><button type="button" onClick={saveTemplate} disabled={saving} className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-100">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {c.save}</button></div>
            </div>
          </div>
        </div>
      )}

      {showSectionManager && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.sections}</div>
                <h2 className="text-2xl font-black text-slate-900">{c.manageSections}</h2>
              </div>
              <button onClick={() => { setShowSectionManager(false); cancelEditSection(); }} className="p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 border-b border-slate-100 bg-slate-50/60">
              <div className="flex gap-3">
                <input value={newSectionName} onChange={(event) => setNewSectionName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') createSection(); }} placeholder={c.newSectionName} className="flex-1 p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold" />
                <button onClick={createSection} disabled={sectionActionLoading || !newSectionName.trim()} className="px-5 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {sectionActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {c.create}
                </button>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-3">
              {categories.length === 0 ? (
                <div className="text-center py-10 text-slate-300 font-black uppercase tracking-widest text-[10px]">{c.noSections}</div>
              ) : categories.map((category) => (
                <div key={category.id} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center gap-3">
                  {editingSectionId === category.id ? (
                    <>
                      <input value={editingSectionName} onChange={(event) => setEditingSectionName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') renameSection(); }} className="flex-1 p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm" autoFocus />
                      <button onClick={renameSection} disabled={sectionActionLoading || !editingSectionName.trim()} className="px-4 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50">{c.save}</button>
                      <button onClick={cancelEditSection} className="p-3 text-slate-300 hover:text-slate-600"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-slate-800 truncate">{category.name}</div>
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{category.templates?.length || 0} {c.templatesCount}</div>
                      </div>
                      <button onClick={() => startEditSection(category)} className="p-3 text-slate-300 hover:text-blue-600 rounded-xl hover:bg-blue-50"><Edit2 size={16} /></button>
                      <button onClick={() => deleteSection(category)} className="p-3 text-slate-300 hover:text-red-600 rounded-xl hover:bg-red-50"><Trash2 size={16} /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAiPolish && selectedTemplate && (
        <TemplateAiPolishModal
          template={selectedTemplate}
          uiLanguage={uiLanguage}
          onClose={() => setShowAiPolish(false)}
          onApply={applyAiPolishSuggestion}
        />
      )}

      {showHelp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black">{c.syntaxTitle}</h2><button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-700 font-black">×</button></div>
            <div className="grid gap-3 text-sm font-semibold text-slate-600"><code className="bg-slate-950 text-white p-3 rounded-xl">{'{{oire}}'}</code><code className="bg-slate-950 text-white p-3 rounded-xl">{'{{statuskuvaus:textarea}}'}</code><code className="bg-slate-950 text-white p-3 rounded-xl">{'{{kipu:select:ei,kyllä}}'}</code><code className="bg-slate-950 text-white p-3 rounded-xl">{'{{kipukuvaus:textarea:showIf:kipu=kyllä}}'}</code></div>
            <p className="text-sm text-slate-400 font-semibold leading-relaxed">{c.syntaxText}</p>
          </div>
        </div>
      )}
    </div>
  );
}
