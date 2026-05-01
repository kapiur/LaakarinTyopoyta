"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
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
import CategoryManagerDialog from '../../../components/templates/CategoryManagerDialog';
import TemplateFieldControl from '../../../components/templates/TemplateFieldControl';
import TemplateSnippetBuilder from '../../../components/templates/TemplateSnippetBuilder';

const emptyForm: TemplateFormData = {
  id: null,
  title: '',
  content: '',
  categoryName: '',
  author: 'Doc',
};

export default function TemplatesRedesignPage() {
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [values, setValues] = useState<TemplateValues>({});
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

      const currentCategory = nextCategories.find((category) => category.id === activeCategoryId);
      const firstCategory = currentCategory || nextCategories[0] || null;

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
      setErrorMsg(err.message || 'Mallien lataus epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
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

  const closeEditor = () => {
    setShowEditor(false);
    setFormData(emptyForm);
    setSaving(false);
  };

  const insertSnippet = (snippet: string) => {
    const textarea = contentTextareaRef.current;
    setFormData((current) => {
      if (!textarea) {
        return { ...current, content: current.content ? `${current.content}\n${snippet}` : snippet };
      }

      const start = textarea.selectionStart ?? current.content.length;
      const end = textarea.selectionEnd ?? current.content.length;
      const before = current.content.slice(0, start);
      const after = current.content.slice(end);
      const needsSpaceBefore = before.length > 0 && !/[\s\n]$/.test(before);
      const needsSpaceAfter = after.length > 0 && !/^[\s\n.,;:!?]/.test(after);
      const inserted = `${needsSpaceBefore ? ' ' : ''}${snippet}${needsSpaceAfter ? ' ' : ''}`;
      const nextContent = `${before}${inserted}${after}`;
      const nextCursor = before.length + inserted.length;

      window.setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(nextCursor, nextCursor);
      }, 0);

      return { ...current, content: nextContent };
    });
  };

  const saveTemplate = async () => {
    if (saving) return;
    if (!formData.title.trim() || !formData.categoryName.trim() || !formData.content.trim()) {
      setErrorMsg('Täytä otsikko, osio ja sisältö.');
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
      if (!res.ok) throw new Error(data.error || 'Tallennus epäonnistui');

      const savedId = data.id || formData.id || null;
      closeEditor();
      await loadTemplates(savedId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Tallennus epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async () => {
    if (!formData.id || saving) return;
    if (!confirm(`Haluatko varmasti poistaa mallin "${formData.title}"?`)) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/templates?id=${formData.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Poisto epäonnistui');
      }
      closeEditor();
      await loadTemplates(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Poisto epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[1800px] mx-auto min-h-[calc(100vh-80px)] p-5 text-slate-900 space-y-5">
      <header className="bg-white border shadow-sm rounded-[2rem] p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/templates" className="w-11 h-11 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Tekstimallit</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yksi työtila mallien käyttöön</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowHelp(true)} className="w-11 h-11 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors" title="Syntaksiohje">
            <HelpCircle size={18} />
          </button>
          <button type="button" onClick={() => setShowCategoryManager(true)} className="h-11 px-5 rounded-2xl bg-white border border-slate-100 text-slate-500 hover:bg-slate-50 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors">
            <Settings size={14} /> Osiot
          </button>
          <button type="button" onClick={openNewTemplate} className="h-11 px-5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 transition-colors">
            <Plus size={14} /> Uusi malli
          </button>
        </div>
      </header>

      {errorMsg && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">{errorMsg}</div>}

      {loading ? (
        <div className="h-[60vh] flex items-center justify-center text-blue-500"><Loader2 className="animate-spin" /></div>
      ) : (
        <main className="grid grid-cols-12 gap-5 min-h-[calc(100vh-220px)]">
          <aside className="col-span-3 bg-white border shadow-sm rounded-[2rem] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Osiot</div>
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
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Etsi mallia..." className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
              {filteredTemplates.length === 0 ? (
                <div className="p-6 text-sm text-slate-300 font-bold text-center">Ei malleja</div>
              ) : filteredTemplates.map((template) => (
                <button key={template.id} type="button" onClick={() => setSelectedTemplateId(template.id)} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedTemplateId === template.id ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' : 'bg-white border-slate-50 hover:border-blue-200 hover:bg-blue-50/30'}`}>
                  <div className="font-black text-sm truncate">{template.title}</div>
                  <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${selectedTemplateId === template.id ? 'text-white/40' : 'text-slate-300'}`}>{activeCategory?.name || 'Osio'}</div>
                </button>
              ))}
            </div>
          </aside>

          <section className="col-span-4 bg-white border shadow-sm rounded-[2rem] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Täytä kentät</div>
                <div className="font-black text-slate-800">{selectedTemplate?.title || 'Valitse malli'}</div>
              </div>
              <div className="flex items-center gap-2">
                {selectedTemplate && <button type="button" onClick={openEditTemplate} className="p-2.5 text-slate-400 hover:text-blue-600 transition-all bg-white rounded-xl border border-slate-100 shadow-sm" title="Muokkaa mallia"><Edit2 size={16} /></button>}
                <MessageSquare className="text-slate-300" size={18} />
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6 no-scrollbar">
              {!selectedTemplate ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-4"><FileText size={46} strokeWidth={1} /><div className="text-[10px] font-black uppercase tracking-widest">Valitse malli</div></div>
              ) : fields.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-2xl text-sm text-slate-400 font-bold">Tässä mallissa ei ole interaktiivisia kenttiä.</div>
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

          <section className="col-span-5 bg-blue-50/20 border border-blue-50 shadow-sm rounded-[2rem] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-blue-50 bg-white/70 flex items-center justify-between">
              <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tulos</div><div className="font-black text-slate-800">{selectedTemplate?.title || 'Ei mallia'}</div></div>
              <div className="flex items-center gap-2">
                <button type="button" className="px-4 py-2.5 rounded-xl bg-white text-blue-600 ring-1 ring-blue-100 text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 flex items-center gap-2"><Sparkles size={13} /> AI-hionta</button>
                <button type="button" onClick={copyResult} disabled={!finalText} className="px-4 py-2.5 rounded-xl bg-white text-emerald-600 ring-1 ring-emerald-100 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-2"><ClipboardCopy size={13} /> {copied ? 'Kopioitu' : 'Kopioi'}</button>
              </div>
            </div>
            <div className="p-8 flex-1 overflow-y-auto whitespace-pre-wrap text-slate-800 text-lg leading-relaxed bg-white/30 no-scrollbar">{finalText || <span className="text-slate-300 italic">Valitse malli ja täytä kentät...</span>}</div>
          </section>
        </main>
      )}

      {showEditor && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-3xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right-6">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formData.id ? 'Muokkaa mallia' : 'Uusi malli'}</div><h2 className="text-2xl font-black text-slate-900">{formData.title || 'Nimetön malli'}</h2></div>
              <button onClick={closeEditor} className="p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Mallin otsikko</label><input value={formData.title} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold shadow-inner" /></div>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Osio / siirrä osioon</label><select value={formData.categoryName} onChange={(event) => setFormData((current) => ({ ...current, categoryName: event.target.value }))} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold shadow-inner"><option value="">Valitse osio</option>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></div>
              </div>

              <TemplateSnippetBuilder onInsert={insertSnippet} />

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-3"><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Sisältö ja muuttujat</label><button type="button" onClick={() => setShowHelp(true)} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center gap-1"><HelpCircle size={12} /> Ohje</button></div>
                <textarea ref={contentTextareaRef} value={formData.content} onChange={(event) => setFormData((current) => ({ ...current, content: event.target.value }))} className="w-full min-h-[480px] p-6 bg-slate-50 border-none rounded-[2rem] outline-none focus:bg-white focus:ring-8 focus:ring-blue-500/5 font-mono text-sm leading-relaxed shadow-inner" placeholder="Kirjoita mallin sisältö... esim. Kipu: {{kipu:select:ei,kyllä}}" />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex items-center justify-between gap-3">
              <button type="button" onClick={deleteTemplate} disabled={!formData.id || saving} className="px-5 py-3 rounded-2xl bg-white text-red-500 ring-1 ring-red-100 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 disabled:opacity-30 flex items-center gap-2"><Trash2 size={14} /> Poista</button>
              <div className="flex items-center gap-3"><button type="button" onClick={closeEditor} className="px-5 py-3 rounded-2xl bg-white text-slate-500 ring-1 ring-slate-100 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">Peruuta</button><button type="button" onClick={saveTemplate} disabled={saving} className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-100">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Tallenna</button></div>
            </div>
          </div>
        </div>
      )}

      {showCategoryManager && <CategoryManagerDialog categories={categories} onClose={() => setShowCategoryManager(false)} onChanged={() => loadTemplates(selectedTemplateId)} />}

      {showHelp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black">Syntaksin pikamuistio</h2><button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-700 font-black">×</button></div>
            <div className="grid gap-3 text-sm font-semibold text-slate-600"><code className="bg-slate-950 text-white p-3 rounded-xl">{'{{oire}}'}</code><code className="bg-slate-950 text-white p-3 rounded-xl">{'{{statuskuvaus:textarea}}'}</code><code className="bg-slate-950 text-white p-3 rounded-xl">{'{{kipu:select:ei,kyllä}}'}</code><code className="bg-slate-950 text-white p-3 rounded-xl">{'{{kipukuvaus:textarea:showIf:kipu=kyllä}}'}</code></div>
            <p className="text-sm text-slate-400 font-semibold leading-relaxed">Tekninen kentän nimi kirjoitetaan latinalla ilman välilyöntejä. Varsinainen lääketieteellinen teksti jää suomeksi.</p>
          </div>
        </div>
      )}
    </div>
  );
}
