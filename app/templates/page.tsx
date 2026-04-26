"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  AlertCircle,
  Bot,
  ChevronRight,
  Copy,
  Edit2,
  FileText,
  HelpCircle,
  Layout,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Wand2,
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
} from '../../lib/templates';

export default function TemplatesPage() {
  const { data: session } = useSession();

  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [templateValues, setTemplateValues] = useState<TemplateValues>({});

  const [isSharing, setIsSharing] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [sharingType, setSharingType] = useState<'template' | 'category'>('template');

  const [isChecking, setIsChecking] = useState(false);
  const [aiFixedText, setAiFixedText] = useState<string | null>(null);
  const [isGeneratingMalli, setIsGeneratingMalli] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [categoryDraftName, setCategoryDraftName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [categoryActionLoading, setCategoryActionLoading] = useState(false);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [movingTemplate, setMovingTemplate] = useState<TemplateItem | null>(null);
  const [moveTargetCategoryId, setMoveTargetCategoryId] = useState<number | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);

  const emptyFormData: TemplateFormData = {
    id: null,
    title: '',
    content: '',
    categoryName: '',
    author: '',
  };

  const [formData, setFormData] = useState<TemplateFormData>(emptyFormData);

  useEffect(() => { fetchTemplates(); }, []);

  useEffect(() => {
    setTemplateValues({});
    setAiFixedText(null);
    setErrorMsg(null);
  }, [selectedTemplate?.id]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      const nextCategories = Array.isArray(data) ? data : [];
      setCategories(nextCategories);
      if (nextCategories.length > 0 && !activeCategoryId) setActiveCategoryId(nextCategories[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeCategory = categories.find((category) => category.id === activeCategoryId);
  const displayedTemplates = activeCategory?.templates?.filter((template) =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  const selectedTemplateFields = selectedTemplate ? getTemplateFields(selectedTemplate.content) : [];
  const targetCategories = categories.filter((category) => category.id !== movingTemplate?.categoryId);

  const handleCreateCategory = async () => {
    if (!categoryDraftName.trim() || categoryActionLoading) return;
    setCategoryActionLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/templates/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryDraftName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kategorian luonti epäonnistui');

      setCategoryDraftName('');
      setActiveCategoryId(data.id);
      await fetchTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || 'Kategorian luonti epäonnistui');
    } finally {
      setCategoryActionLoading(false);
    }
  };

  const startRenameCategory = (category: TemplateCategory) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const cancelRenameCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleRenameCategory = async () => {
    if (!editingCategoryId || !editingCategoryName.trim() || categoryActionLoading) return;
    setCategoryActionLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/templates/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingCategoryId, name: editingCategoryName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kategorian päivitys epäonnistui');

      cancelRenameCategory();
      await fetchTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || 'Kategorian päivitys epäonnistui');
    } finally {
      setCategoryActionLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const category = categories.find((item) => item.id === id);
    const templateCount = category?.templates?.length || 0;
    const message = templateCount > 0
      ? `Haluatko varmasti poistaa kategorian "${category?.name}" ja sen ${templateCount} mallia? Tätä ei voi perua.`
      : `Haluatko varmasti poistaa kategorian "${category?.name}"?`;

    if (!confirm(message)) return;
    setCategoryActionLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/templates/categories?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kategorian poisto epäonnistui');

      if (activeCategoryId === id) setActiveCategoryId(null);
      if (selectedTemplate?.categoryId === id) setSelectedTemplate(null);
      await fetchTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || 'Kategorian poisto epäonnistui');
    } finally {
      setCategoryActionLoading(false);
    }
  };

  const openMoveModal = (template: TemplateItem) => {
    const firstTarget = categories.find((category) => category.id !== template.categoryId);
    setMovingTemplate(template);
    setMoveTargetCategoryId(firstTarget?.id || null);
    setIsMoveModalOpen(true);
  };

  const closeMoveModal = () => {
    setIsMoveModalOpen(false);
    setMovingTemplate(null);
    setMoveTargetCategoryId(null);
  };

  const handleMoveTemplate = async () => {
    if (!movingTemplate || !moveTargetCategoryId || moveLoading) return;
    setMoveLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/templates/move', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: movingTemplate.id,
          categoryId: moveTargetCategoryId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mallin siirto epäonnistui');

      setActiveCategoryId(moveTargetCategoryId);
      setSelectedTemplate(null);
      closeMoveModal();
      await fetchTemplates();
    } catch (err: any) {
      setErrorMsg(err.message || 'Mallin siirto epäonnistui');
    } finally {
      setMoveLoading(false);
    }
  };

  const handleShare = async () => {
    if (!shareEmail.trim()) return;
    setShareLoading(true);

    try {
      const templatesToShare = sharingType === 'category'
        ? categories.find((category) => category.id === activeCategoryId)?.templates || []
        : selectedTemplate ? [selectedTemplate] : [];

      for (const template of templatesToShare) {
        await fetch('/api/templates/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: template.id, targetEmail: shareEmail.toLowerCase().trim() }),
        });
      }

      alert(sharingType === 'category' ? 'Koko kategoria jaettu!' : 'Malli jaettu!');
      setIsSharing(false);
      setShareEmail('');
    } catch (err) {
      alert('Jakamisvirhe');
    } finally {
      setShareLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Haluatko varmasti poistaa tämän mallin?')) return;

    try {
      const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedTemplate?.id === id) setSelectedTemplate(null);
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const anonymize = (text: string) => {
    const hetuRegex = /\b\d{6}[-+ABCDEF]\d{3}[0-9A-Z]\b/gi;
    return text.replace(hetuRegex, '[HETU]');
  };

  const handleGenerateMalli = async () => {
    if (!formData.content.trim() || isGeneratingMalli) return;
    setIsGeneratingMalli(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `malli: Luo dynaaminen lääketieteellinen pohja tästä tekstistä: ${anonymize(formData.content)}` }]
        }),
      });
      const data = await response.json();
      if (data.content) {
        setFormData((prev) => ({ ...prev, content: data.content }));
      } else if (data.error) {
        setErrorMsg(data.details || data.error);
      }
    } catch (err) {
      setErrorMsg('Yhteysvirhe tekoälyyn');
      console.error(err);
    } finally {
      setIsGeneratingMalli(false);
    }
  };

  const generateFinalText = useMemo(() => {
    if (aiFixedText) return aiFixedText;
    if (!selectedTemplate) return '';
    return renderTemplate(selectedTemplate.content, templateValues);
  }, [selectedTemplate, templateValues, aiFixedText]);

  const handleAICheck = async () => {
    if (!generateFinalText || isChecking) return;
    setIsChecking(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: anonymize(generateFinalText), mode: 'fix' }),
      });
      const data = await response.json();
      if (data.content) {
        const cleanContent = data.content.split(/Korjaukset:|Huomautukset:|Selitykset:/i)[0].trim();
        setAiFixedText(cleanContent);
      } else if (data.error) {
        setErrorMsg(data.details || data.error);
      }
    } catch (err) {
      setErrorMsg('Virhe AI-hionnassa');
      console.error(err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateFinalText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim() || !formData.categoryName.trim()) {
      alert('Täytä kentät!');
      return;
    }

    try {
      const method = formData.id ? 'PUT' : 'POST';
      await fetch('/api/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, author: session?.user?.email || 'Doc' }),
      });
      setIsAdding(false);
      setIsEditing(false);
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const startEditing = (template: TemplateItem) => {
    setFormData({
      id: template.id,
      title: template.title,
      content: template.content,
      categoryName: categories.find((category) => category.id === template.categoryId)?.name || '',
      author: template.author || '',
    });
    setIsEditing(true);
    setIsAdding(false);
  };

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-4 p-4 text-slate-900 font-sans relative animate-in fade-in duration-500">
      {errorMsg && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] bg-red-50 border border-red-100 p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <AlertCircle className="text-red-500" size={20} />
          <span className="text-xs font-bold text-red-800">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-2 text-red-300 hover:text-red-500"><X size={16} /></button>
        </div>
      )}

      <div className="flex items-center justify-between bg-white p-6 rounded-[2.5rem] border shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <Layout size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Tekstimallit</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hallinta ja generointi</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsManagingCategories(true)}
            className="bg-white text-slate-500 border border-slate-100 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 shadow-sm transition-all active:scale-95 flex items-center gap-2 text-sm"
          >
            <Layout size={16} /> Hallinnoi osioita
          </button>
          <button
            onClick={() => { setIsAdding(true); setIsEditing(false); setSelectedTemplate(null); setFormData(emptyFormData); }}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center gap-2 text-sm"
          >
            <Plus size={18} /> Uusi malli
          </button>
        </div>
      </div>

      <div className="flex bg-white p-2 rounded-2xl border shadow-sm overflow-x-auto no-scrollbar gap-2 flex-shrink-0 items-center">
        {categories.map((category) => (
          <div key={category.id} className="relative group/cat">
            <button
              onClick={() => { setActiveCategoryId(category.id); setSelectedTemplate(null); setIsAdding(false); setIsEditing(false); setAiFixedText(null); }}
              className={`px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all min-w-[140px] pr-12 ${activeCategoryId === category.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              {category.name}
            </button>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-all">
              <button
                onClick={(e) => { e.stopPropagation(); setSharingType('category'); setActiveCategoryId(category.id); setIsSharing(true); }}
                className={`p-1 rounded-md ${activeCategoryId === category.id ? 'text-white/50 hover:text-white' : 'text-slate-300 hover:text-blue-500'}`}
              >
                <Share2 size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsManagingCategories(true); startRenameCategory(category); }}
                className={`p-1 rounded-md ${activeCategoryId === category.id ? 'text-white/50 hover:text-white' : 'text-slate-300 hover:text-blue-500'}`}
              >
                <Edit2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 pb-2 overflow-hidden">
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input
              placeholder="Etsi malleja..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : displayedTemplates.map((template) => (
              <div key={template.id} className="group relative">
                <button
                  onClick={() => { setSelectedTemplate(template); setIsAdding(false); setIsEditing(false); setAiFixedText(null); }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden pr-20 ${selectedTemplate?.id === template.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white border-slate-50 hover:border-blue-200'}`}
                >
                  <span className="font-bold text-xs truncate block relative z-10">{template.title}</span>
                  <ChevronRight size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all ${selectedTemplate?.id === template.id ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'}`} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openMoveModal(template); }}
                  className={`absolute right-10 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all z-20 ${selectedTemplate?.id === template.id ? 'text-white/50 hover:text-white' : 'text-slate-200 hover:text-blue-500 opacity-0 group-hover:opacity-100'}`}
                  title="Siirrä osioon"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={(e) => handleDeleteTemplate(template.id, e)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all z-20 ${selectedTemplate?.id === template.id ? 'text-white/40 hover:text-white' : 'text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-9 min-h-0">
          {(isAdding || isEditing) ? (
            <div className="bg-white h-full rounded-[3rem] border shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-8">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><Edit2 size={18} /></div>
                  <h2 className="text-lg font-bold text-slate-800">{isEditing ? 'Muokkaa mallia' : 'Luo uusi malli'}</h2>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowHelp(true)} className="p-3 text-slate-300 hover:text-blue-600 transition-colors"><HelpCircle size={20} /></button>
                  <button
                    onClick={handleGenerateMalli}
                    disabled={isGeneratingMalli || !formData.content}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                  >
                    {isGeneratingMalli ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                    AI-Rakenne
                  </button>
                  <button onClick={() => { setIsAdding(false); setIsEditing(false); }} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-300"><X size={20}/></button>
                </div>
              </div>
              <div className="p-10 flex-1 overflow-y-auto space-y-8 no-scrollbar bg-white">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 ml-4 uppercase tracking-[0.2em]">Mallin Otsikko</label>
                    <input className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold transition-all shadow-inner" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 ml-4 uppercase tracking-[0.2em]">Kategoria</label>
                    <input className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold transition-all shadow-inner" value={formData.categoryName} onChange={(e) => setFormData({...formData, categoryName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-blue-600 uppercase ml-4 flex items-center gap-2 tracking-[0.2em]"><Bot size={14}/> Sisältö & Muuttujat</label>
                  <textarea className="w-full p-8 bg-slate-50 border-none rounded-[2.5rem] font-mono text-sm min-h-[400px] outline-none focus:bg-white focus:ring-8 focus:ring-blue-500/5 transition-all leading-relaxed shadow-inner" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} />
                </div>
                <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-black transition-all text-[11px]">Tallenna Järjestelmään</button>
              </div>
            </div>
          ) : selectedTemplate ? (
            <div className="grid grid-cols-12 h-full gap-6">
              <div className="col-span-5 bg-white rounded-[3rem] border shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 border-b bg-slate-50/20 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-400"><MessageSquare size={14} /><span className="font-black uppercase text-[9px] tracking-[0.2em]">Parametrit</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => openMoveModal(selectedTemplate)} className="p-2.5 text-slate-300 hover:text-blue-600 transition-all bg-white rounded-xl border border-slate-100 shadow-sm" title="Siirrä osioon"><ChevronRight size={16} /></button>
                    <button onClick={() => startEditing(selectedTemplate)} className="p-2.5 text-slate-300 hover:text-blue-600 transition-all bg-white rounded-xl border border-slate-100 shadow-sm"><Edit2 size={16} /></button>
                  </div>
                </div>
                <div className="p-8 flex-1 overflow-y-auto no-scrollbar space-y-8">
                  {selectedTemplateFields.map((part, idx) => {
                    if (!isTemplateFieldVisible(part.condition, templateValues)) return null;
                    return (
                      <div key={`${part.raw}-${idx}`} className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{part.displayName}</label>
                        {part.type === 'select' ? (
                          <div className="flex flex-wrap gap-2">
                            {part.options.map((opt) => (
                              <button key={opt} onClick={() => { setTemplateValues((prev) => ({ ...prev, [part.id]: opt })); setAiFixedText(null); }} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${templateValues[part.id] === opt ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-300 hover:bg-white'}`}>{opt}</button>
                            ))}
                          </div>
                        ) : (
                          <input className="p-4 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-sm transition-all shadow-inner" value={templateValues[part.id] || ''} onChange={(e) => { setTemplateValues((prev) => ({ ...prev, [part.id]: e.target.value })); setAiFixedText(null); }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="col-span-7 bg-blue-50/10 rounded-[3rem] flex flex-col overflow-hidden border border-blue-50 shadow-sm relative">
                <div className="p-6 border-b border-blue-50 flex justify-between items-center bg-white/40 backdrop-blur-md">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /><span className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">Tulos</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => { setSharingType('template'); setIsSharing(true); }} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[9px] font-black tracking-widest uppercase transition-all hover:bg-slate-50 flex items-center gap-2 shadow-sm"><Share2 size={12} /> Jaa</button>
                    <button onClick={handleAICheck} disabled={isChecking || !generateFinalText} className={`px-5 py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all flex items-center gap-2 shadow-sm ${aiFixedText ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50'}`}>{isChecking ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI-Hionta</button>
                    <button onClick={handleCopy} className={`px-6 py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all shadow-sm ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50'}`}>{copied ? 'Kopioitu!' : 'Kopioi'}</button>
                  </div>
                </div>
                <div className="p-12 flex-1 overflow-y-auto text-slate-800 font-sans text-lg leading-relaxed whitespace-pre-wrap no-scrollbar">
                  {isChecking ? <div className="flex flex-col items-center justify-center h-full gap-4 text-blue-300 animate-pulse"><Bot size={48} strokeWidth={1} /><span className="text-[10px] font-black uppercase tracking-widest">Hiotaan tekstiä...</span></div> : (generateFinalText || <span className="text-slate-200 italic font-light">Määritä parametrit...</span>)}
                </div>
                {aiFixedText && (
                  <div className="absolute bottom-10 left-10 right-10 p-5 bg-white border border-blue-100 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-6">
                    <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0"><Bot size={18} /></div>
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-800 uppercase tracking-tight">AI on optimoinut tekstin.</span><button onClick={() => setAiFixedText(null)} className="text-[8px] text-blue-400 uppercase font-black text-left hover:text-blue-600">Palauta alkuperäinen</button></div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full bg-white rounded-[3rem] border border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-200 gap-6"><FileText size={64} strokeWidth={0.5} className="opacity-20" /><span className="font-black uppercase tracking-[0.4em] text-[9px]">Valitse malli aloittaaksesi</span></div>
          )}
        </div>
      </div>

      {isMoveModalOpen && movingTemplate && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full overflow-hidden border">
            <div className="p-8 border-b bg-slate-900 flex justify-between items-center text-white">
              <div className="flex items-center gap-3 font-black uppercase text-xs tracking-widest"><ChevronRight size={18} /> Siirrä malli</div>
              <button onClick={closeMoveModal} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-10 space-y-6">
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Malli</div>
                <div className="p-4 bg-slate-50 rounded-2xl font-bold text-sm text-slate-800">{movingTemplate.title}</div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Uusi osio</label>
                <select
                  className="mt-2 w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold transition-all shadow-inner"
                  value={moveTargetCategoryId || ''}
                  onChange={(e) => setMoveTargetCategoryId(Number(e.target.value))}
                >
                  {targetCategories.length === 0 ? <option value="">Ei muita osioita</option> : targetCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t flex gap-3 justify-end">
              <button onClick={closeMoveModal} className="px-6 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px]">Peruuta</button>
              <button onClick={handleMoveTemplate} disabled={moveLoading || !moveTargetCategoryId} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all text-[10px] shadow-lg shadow-blue-100 disabled:opacity-50">
                {moveLoading ? <Loader2 size={14} className="animate-spin" /> : 'Siirrä'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isManagingCategories && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full overflow-hidden border max-h-[85vh] flex flex-col">
            <div className="p-8 border-b bg-slate-900 flex justify-between items-center text-white">
              <div className="flex items-center gap-3 font-black uppercase text-xs tracking-widest"><Layout size={18} /> Osioiden hallinta</div>
              <button onClick={() => { setIsManagingCategories(false); cancelRenameCategory(); }} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 border-b bg-slate-50/60">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Uusi osio</label>
              <div className="flex gap-3 mt-2">
                <input className="flex-1 p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold transition-all shadow-inner" placeholder="Esim. Status" value={categoryDraftName} onChange={(e) => setCategoryDraftName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory(); }} />
                <button onClick={handleCreateCategory} disabled={categoryActionLoading || !categoryDraftName.trim()} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">{categoryActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Luo</button>
              </div>
            </div>
            <div className="p-8 flex-1 overflow-y-auto no-scrollbar space-y-3">
              {categories.length === 0 ? <div className="text-center py-10 text-slate-300 font-black uppercase tracking-widest text-[10px]">Ei osioita</div> : categories.map((category) => (
                <div key={category.id} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center gap-3">
                  {editingCategoryId === category.id ? (
                    <>
                      <input className="flex-1 p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold text-sm" value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCategory(); }} autoFocus />
                      <button onClick={handleRenameCategory} disabled={categoryActionLoading || !editingCategoryName.trim()} className="px-4 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50">Tallenna</button>
                      <button onClick={cancelRenameCategory} className="p-3 text-slate-300 hover:text-slate-600 rounded-xl hover:bg-slate-50"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setActiveCategoryId(category.id); setSelectedTemplate(null); setIsManagingCategories(false); }} className="flex-1 text-left">
                        <div className="font-black text-sm text-slate-800">{category.name}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{category.templates?.length || 0} mallia</div>
                      </button>
                      <button onClick={() => startRenameCategory(category)} className="p-3 text-slate-300 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-colors" title="Nimeä uudelleen"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteCategory(category.id)} disabled={categoryActionLoading} className="p-3 text-slate-300 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50" title="Poista"><Trash2 size={16} /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isSharing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full overflow-hidden border">
            <div className="p-8 border-b bg-slate-900 flex justify-between items-center text-white"><div className="flex items-center gap-3 font-black uppercase text-xs tracking-widest"><Share2 size={18} /> {sharingType === 'category' ? 'Jaa kategoria' : 'Jaa malli'}</div><button onClick={() => setIsSharing(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button></div>
            <div className="p-10 space-y-6">
              <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Vastaanottajan sähköposti</label><input type="email" placeholder="matti.meikalainen@terveys.fi" className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold transition-all shadow-inner" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} /></div>
              <p className="text-[10px] text-slate-400 italic px-4 leading-relaxed">{sharingType === 'category' ? 'Kaikki tämän kategorian mallit kopioidaan toisen käyttäjän tilille.' : 'Tämä malli kopioidaan suoraan toisen käyttäjän vastaavaan kategoriaan.'}</p>
            </div>
            <div className="p-8 bg-slate-50 border-t flex gap-3 justify-end"><button onClick={() => setIsSharing(false)} className="px-6 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px]">Peruuta</button><button onClick={handleShare} disabled={shareLoading || !shareEmail} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all text-[10px] shadow-lg shadow-blue-100 disabled:opacity-50">{shareLoading ? <Loader2 size={14} className="animate-spin" /> : 'Lähetä'}</button></div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full overflow-hidden border">
            <div className="p-8 border-b bg-slate-900 flex justify-between items-center text-white"><div className="flex items-center gap-3 font-black uppercase text-xs tracking-widest"><Sparkles size={18} /> AI Rakenneohje</div><button onClick={() => setShowHelp(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button></div>
            <div className="p-10 space-y-6 text-xs text-slate-500 leading-relaxed font-medium"><p>AI osaa rakentaa dynaamisia lääketieteellisiä pohjia sekunneissa vapaasta tekstistä.</p><div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 font-mono text-[10px] space-y-3 shadow-inner"><div className="text-blue-600 font-black uppercase text-[8px]">Esimerkki:</div><div className="text-slate-700 italic">"Potilas tajuissaan, vatsa pehmeä."</div><div className="text-slate-800 pt-2 font-bold">GPT-5.4 luo automaattisesti valinnat:</div><div className="text-blue-800">"Potilas {"{{taju:select:tajuissaan,unelias}}"}. Vatsa {"{{vatsa:select:pehmeä,arka}}"}. "</div></div></div>
            <div className="p-8 bg-slate-50 border-t flex justify-end"><button onClick={() => setShowHelp(false)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]">Selvä</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
