"use client";
import { useState, useEffect, useMemo } from 'react';
import { useSession } from "next-auth/react";
import { 
  Plus, Search, Trash2, ChevronRight, 
  Copy, Check, Loader2, X, Edit2, Bot, Sparkles, Wand2, HelpCircle, 
  FileText, Layout, MessageSquare
} from 'lucide-react';

export default function TemplatesPage() {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});

  // AI состояния
  const [isChecking, setIsChecking] = useState(false);
  const [aiFixedText, setAiFixedText] = useState<string | null>(null);
  const [isGeneratingMalli, setIsGeneratingMalli] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [formData, setFormData] = useState({
    id: null as number | null,
    title: '',
    content: '',
    categoryName: '',
    author: ''
  });

  useEffect(() => { fetchTemplates(); }, []);
  useEffect(() => { 
    setTemplateValues({}); 
    setAiFixedText(null); 
  }, [selectedTemplate?.id]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
      if (data.length > 0 && !activeCategoryId) setActiveCategoryId(data[0].id);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDeleteTemplate = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Haluatko varmasti poistaa tämän mallin?")) return;
    try {
      const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedTemplate?.id === id) setSelectedTemplate(null);
        fetchTemplates();
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Haluatko poistaa koko kategorian ja kaikki sen mallit?")) return;
    try {
      const res = await fetch(`/api/templates/category?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setActiveCategoryId(null);
        fetchTemplates();
      }
    } catch (err) { console.error(err); }
  };

  const anonymize = (text: string) => {
    const hetuRegex = /\b\d{6}[-+ABCDEF]\d{3}[0-9A-Z]\b/gi;
    return text.replace(hetuRegex, '[HETU]');
  };

  const handleGenerateMalli = async () => {
    if (!formData.content.trim() || isGeneratingMalli) return;
    setIsGeneratingMalli(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: `malli: ${anonymize(formData.content)}` }] 
        }),
      });
      const data = await response.json();
      if (data.content) setFormData(prev => ({ ...prev, content: data.content }));
    } catch (err) { console.error(err); } finally { setIsGeneratingMalli(false); }
  };

  const parseTemplate = (content: string) => {
    const parts = [];
    const regex = /{{(.*?)}}/g;
    let lastIndex = 0, match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
      }
      const rawConfig = match[1];
      const config = rawConfig.split(':').map(p => p.trim());
      const id = config[0];
      const showIfCond = config.find(c => c.toLowerCase().startsWith('showif:'));
      let condition = null;
      if (showIfCond) {
        const cleanCond = showIfCond.replace(/showif:/i, '').trim();
        const [pId, pVal] = cleanCond.split('=');
        if (pId && pVal) condition = { parentId: pId.trim().toLowerCase(), value: pVal.trim().toLowerCase() };
      }
      parts.push({ 
        id: id.toLowerCase(), displayName: id,
        type: config.includes('select') ? 'select' : 'input', 
        options: config.find(c => c.includes(','))?.split(',').map(o => o.trim()) || [],
        condition, raw: rawConfig 
      });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) parts.push({ type: 'text', value: content.slice(lastIndex) });
    return parts;
  };

  const generateFinalText = useMemo(() => {
    if (aiFixedText) return aiFixedText;
    if (!selectedTemplate) return "";
    const parsed = parseTemplate(selectedTemplate.content);
    let result = "";
    parsed.forEach(part => {
      if (part.type === 'text') result += part.value;
      else {
        let isVisible = true;
        if (part.condition) {
          const currentVal = (templateValues[part.condition.parentId] || "").toLowerCase().trim();
          isVisible = currentVal === part.condition.value;
        }
        if (isVisible) result += templateValues[part.id] || `[${part.displayName}]`;
      }
    });
    return result.replace(/[ ]{2,}/g, ' ').replace(/\s+\./g, '.').trim();
  }, [selectedTemplate, templateValues, aiFixedText]);

  const handleAICheck = async () => {
    if (!generateFinalText || isChecking) return;
    setIsChecking(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: anonymize(generateFinalText), mode: 'fix' }),
      });
      const data = await response.json();
      if (data.content) {
        const cleanContent = data.content.split(/Korjaukset:/i)[0].trim();
        setAiFixedText(cleanContent);
      }
    } catch (err) { console.error(err); } finally { setIsChecking(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateFinalText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim() || !formData.categoryName.trim()) {
      alert("Täytä kentät!"); return;
    }
    try {
      const method = formData.id ? 'PUT' : 'POST';
      await fetch('/api/templates', {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, author: session?.user?.email || 'Doc' }),
      });
      setIsAdding(false); setIsEditing(false); fetchTemplates();
    } catch (err) { console.error(err); }
  };

  const startEditing = (template: any) => {
    setFormData({
      id: template.id, title: template.title, content: template.content,
      categoryName: categories.find(c => c.id === template.categoryId)?.name || '', 
      author: template.author || ''
    });
    setIsEditing(true); setIsAdding(false);
  };

  const activeCategory = categories.find(c => c.id === activeCategoryId);
  const displayedTemplates = activeCategory?.templates || [];

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-4 p-4 text-slate-900 font-sans relative">
      
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[2.5rem] border shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <Layout size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Tekstimallit</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hallinta ja generointi</p>
          </div>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setIsEditing(false); setSelectedTemplate(null); setFormData({id:null, title:'', content:'', categoryName:'', author:''}); }}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-100 uppercase tracking-[0.15em] text-[11px] transition-all active:scale-95"
        >
          + Uusi Malli
        </button>
      </div>

      {/* CATEGORIES */}
      <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm overflow-x-auto no-scrollbar gap-1 flex-shrink-0 items-center">
        {categories.map(cat => (
          <div key={cat.id} className="relative group/cat">
            <button onClick={() => { setActiveCategoryId(cat.id); setSelectedTemplate(null); setIsAdding(false); setIsEditing(false); setAiFixedText(null); }}
              className={`px-6 py-3 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all min-w-[130px] pr-8 ${activeCategoryId === cat.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
              {cat.name}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all ${activeCategoryId === cat.id ? 'text-white/50 hover:text-white' : 'text-slate-300 hover:text-red-500 opacity-0 group-hover/cat:opacity-100'}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 pb-2 overflow-hidden">
        {/* SIDEBAR */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              placeholder="Etsi malleja..." 
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm transition-all" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : displayedTemplates.map((t: any) => (
              <div key={t.id} className="group relative">
                <button 
                  onClick={() => { setSelectedTemplate(t); setIsAdding(false); setIsEditing(false); setAiFixedText(null); }} 
                  className={`w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden pr-12 ${selectedTemplate?.id === t.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-sm'}`}
                >
                  <span className="font-bold text-sm truncate block relative z-10">{t.title}</span>
                  <ChevronRight size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all ${selectedTemplate?.id === t.id ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'}`} />
                </button>
                <button 
                  onClick={(e) => handleDeleteTemplate(t.id, e)}
                  className={`absolute right-10 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all z-20 ${selectedTemplate?.id === t.id ? 'text-white/40 hover:text-white' : 'text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* WORK AREA */}
        <div className="col-span-9 min-h-0">
          {(isAdding || isEditing) ? (
            <div className="bg-white h-full rounded-[2.5rem] border shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-4">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <Edit2 size={18} />
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">{isEditing ? 'Muokkaa mallia' : 'Luo uusi malli'}</h2>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowHelp(true)} className="p-3 text-slate-400 hover:text-blue-600 transition-colors"><HelpCircle size={20} /></button>
                  <button 
                    onClick={handleGenerateMalli}
                    disabled={isGeneratingMalli || !formData.content}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-lg shadow-emerald-100"
                  >
                    {isGeneratingMalli ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                    {isGeneratingMalli ? 'Käsitellään...' : 'AI-Generoi Rakenne'}
                  </button>
                  <button onClick={() => {setIsAdding(false); setIsEditing(false);}} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
                </div>
              </div>
              <div className="p-8 flex-1 overflow-y-auto space-y-6 no-scrollbar bg-white">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-widest">Mallin Otsikko</label>
                    <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 font-bold transition-all" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-widest">Kategoria</label>
                    <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 font-bold transition-all" value={formData.categoryName} onChange={e => setFormData({...formData, categoryName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-blue-600 uppercase ml-2 flex items-center gap-2 tracking-[0.15em]"><Bot size={14}/> Mallin sisältö</label>
                  <textarea 
                    className="w-full p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] font-mono text-sm min-h-[450px] outline-none focus:bg-white focus:ring-8 focus:ring-blue-500/5 transition-all leading-relaxed shadow-inner" 
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})} 
                  />
                </div>
                <button onClick={handleSave} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all text-xs">Tallenna Tietokantaan</button>
              </div>
            </div>
          ) : selectedTemplate ? (
            <div className="grid grid-cols-12 h-full gap-6">
              {/* INPUTS PANEL */}
              <div className="col-span-5 bg-white rounded-[2.5rem] border shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-slate-400" />
                    <span className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Parametrit</span>
                  </div>
                  <button onClick={() => startEditing(selectedTemplate)} className="p-2.5 text-slate-400 hover:text-blue-600 transition-all bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md"><Edit2 size={16} /></button>
                </div>
                <div className="p-8 flex-1 overflow-y-auto no-scrollbar space-y-8 bg-white">
                  {parseTemplate(selectedTemplate.content).filter(p => p.type !== 'text').map((part, idx) => {
                    let isVisible = true;
                    if (part.condition) {
                      const currentVal = (templateValues[part.condition.parentId] || "").toLowerCase().trim();
                      isVisible = currentVal === part.condition.value;
                    }
                    if (!isVisible) return null;
                    return (
                      <div key={idx} className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">{part.displayName}</label>
                        {part.type === 'select' ? (
                          <div className="flex flex-wrap gap-2">
                            {part.options.map((opt: any) => (
                              <button key={opt} onClick={() => { setTemplateValues(prev => ({ ...prev, [part.id]: opt })); setAiFixedText(null); }} 
                                className={`px-5 py-3 rounded-xl text-xs font-bold border transition-all ${templateValues[part.id] === opt ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-300 hover:bg-white shadow-sm'}`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-sm transition-all" value={templateValues[part.id] || ''} onChange={(e) => { setTemplateValues(prev => ({ ...prev, [part.id]: e.target.value })); setAiFixedText(null); }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* OUTPUT PANEL */}
              <div className="col-span-7 bg-blue-50/30 rounded-[2.5rem] flex flex-col overflow-hidden border border-blue-100 shadow-sm relative backdrop-blur-sm">
                <div className="p-6 border-b border-blue-100 flex justify-between items-center bg-white/60">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200" />
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Tulosnäkymä</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAICheck} disabled={isChecking || !generateFinalText}
                      className={`px-5 py-2.5 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 shadow-sm ${aiFixedText ? 'bg-blue-600 text-white border-blue-500' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}>
                      {isChecking ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {aiFixedText ? 'Optimoitu' : 'AI-Tarkistus'}
                    </button>
                    <button onClick={handleCopy} className={`px-6 py-2.5 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all shadow-sm ${copied ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}>
                      {copied ? 'Kopioitu!' : 'Kopioi'}
                    </button>
                  </div>
                </div>
                <div className="p-10 flex-1 overflow-y-auto text-slate-800 font-sans text-lg leading-relaxed whitespace-pre-wrap no-scrollbar">
                  {isChecking ? (
                    <div className="flex items-center gap-3 text-blue-400 italic animate-pulse"><Bot size={24} /> AI muotoilee tekstiä...</div>
                  ) : (
                    generateFinalText || <span className="text-slate-300 italic">Määritä parametrit nähdäksesi valmiin tekstin...</span>
                  )}
                </div>
                {aiFixedText && (
                  <div className="absolute bottom-8 left-8 right-8 p-5 bg-white/80 border border-blue-200 rounded-3xl text-[11px] text-blue-700 flex items-center gap-4 animate-in slide-in-from-bottom-4 shadow-xl shadow-blue-900/5 backdrop-blur-md">
                    <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0"><Bot size={18} /></div>
                    <span className="font-bold tracking-tight leading-tight">AI on hionut tekstin lääketieteelliseen ja kieliopillisesti oikeaan muotoon.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 gap-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                <FileText size={40} strokeWidth={1} />
              </div>
              <span className="font-black uppercase tracking-[0.3em] text-[10px]">Valitse malli listasta aloittaaksesi</span>
            </div>
          )}
        </div>
      </div>

      {/* HELP MODAL */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full overflow-hidden border">
            <div className="p-8 border-b bg-blue-600 flex justify-between items-center text-white">
              <div className="flex items-center gap-3 font-black uppercase text-sm tracking-widest"><Sparkles size={20} /> AI-Generointi Ohje</div>
              <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-10 space-y-6 text-sm text-slate-600 leading-relaxed font-medium">
              <p>AI osaa rakentaa älykkäitä malleja suoraan vapaasta tekstistä.</p>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 font-mono text-[11px] space-y-3 shadow-inner">
                <div className="text-slate-400 italic uppercase text-[9px] font-black">Esimerkki:</div>
                <div className="text-slate-800">"Potilas tajuissaan, RR 120/80."</div>
                <div className="text-blue-600 pt-2 font-black uppercase text-[9px]">AI luo rakenteen:</div>
                <div className="text-blue-800">"Potilas {"{{taju:select:tajuissaan,unelias}}"}. RR {"{{paine}}"}. "</div>
              </div>
              <ul className="space-y-4 list-disc pl-5 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                <li>Luo automaattiset valintapainikkeet</li>
                <li>Lisää täytеттävät tekstikentät</li>
                <li>Korjaa kielioppia lennosta</li>
              </ul>
            </div>
            <div className="p-8 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setShowHelp(false)} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all text-[11px] shadow-lg shadow-blue-100">Ymmärretty</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
