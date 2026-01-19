"use client";
import { useState, useEffect, useMemo } from 'react';
import { useSession } from "next-auth/react";
import { 
  Plus, Search, Trash2, ChevronRight, 
  Copy, Check, Loader2, X, Edit2, Bot, Sparkles, Wand2, HelpCircle 
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

  // Анонимизатор HETU (все века)
  const anonymize = (text: string) => {
    const hetuRegex = /\b\d{6}[-+ABCDEF]\d{3}[0-9A-Z]\b/gi;
    return text.replace(hetuRegex, '[HETU]');
  };

  // Генерация структуры шаблона из обычного текста
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
      if (data.content) {
        setFormData(prev => ({ ...prev, content: data.content }));
      }
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
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-6 p-4 text-slate-900 font-sans relative">
      
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border shadow-sm flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-800">Tekstimallit</h1>
        <button 
          onClick={() => { setIsAdding(true); setIsEditing(false); setSelectedTemplate(null); setFormData({id:null, title:'', content:'', categoryName:'', author:''}); }}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 uppercase tracking-widest text-xs transition-all active:scale-95"
        >
          + UUSI MALLI
        </button>
      </div>

      {/* CATEGORIES */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
        {categories.map(cat => (
          <button key={cat.id} onClick={() => { setActiveCategoryId(cat.id); setSelectedTemplate(null); setIsAdding(false); setIsEditing(false); setAiFixedText(null); }}
            className={`px-6 py-3 rounded-2xl font-bold text-sm border transition-all ${activeCategoryId === cat.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:border-slate-300'}`}>
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 pb-4 overflow-hidden">
        {/* TEMPLATE LIST */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input placeholder="Hae..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
            {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div> : displayedTemplates.map((t: any) => (
              <button key={t.id} onClick={() => { setSelectedTemplate(t); setIsAdding(false); setIsEditing(false); setAiFixedText(null); }} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedTemplate?.id === t.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                <span className="font-bold text-sm truncate block">{t.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* WORK AREA */}
        <div className="col-span-9 min-h-0">
          {(isAdding || isEditing) ? (
            <div className="bg-white h-full rounded-3xl border shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-4">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold tracking-tight">{isEditing ? 'Muokkaa mallia' : 'Uusi malli'}</h2>
                <div className="flex gap-3 items-center">
                  <button onClick={() => setShowHelp(true)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Ohje"><HelpCircle size={20} /></button>
                  <button 
                    onClick={handleGenerateMalli}
                    disabled={isGeneratingMalli || !formData.content}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all disabled:opacity-50"
                  >
                    {isGeneratingMalli ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                    {isGeneratingMalli ? 'GENERUOTAAN...' : 'AI-GENEROI RAKENNE'}
                  </button>
                  <button onClick={() => {setIsAdding(false); setIsEditing(false);}} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X /></button>
                </div>
              </div>
              <div className="p-8 flex-1 overflow-y-auto space-y-6 no-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Otsikko" className="p-4 bg-slate-50 border rounded-2xl outline-none focus:bg-white" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  <input placeholder="Kategoria" className="p-4 bg-slate-50 border rounded-2xl outline-none focus:bg-white" value={formData.categoryName} onChange={e => setFormData({...formData, categoryName: e.target.value})} />
                </div>
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-bold text-blue-600 uppercase ml-1 flex items-center gap-1"><Bot size={12}/> Mallin sisältö (Käytä AI-painiketta rakenteen luomiseen)</label>
                  <textarea 
                    placeholder="Kirjoita teksti tai käytä tekoälyä..." 
                    className="w-full p-6 bg-slate-50 border rounded-3xl font-mono text-sm min-h-[400px] outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all" 
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})} 
                  />
                </div>
                <button onClick={handleSave} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">Tallenna malli</button>
              </div>
            </div>
          ) : selectedTemplate ? (
            <div className="grid grid-cols-2 h-full gap-6">
              {/* INTERACTIVE CONTROLS */}
              <div className="bg-white rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 uppercase text-[10px] tracking-widest">Valinnat</h3>
                  <button onClick={() => startEditing(selectedTemplate)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={18} /></button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto no-scrollbar space-y-6">
                  {parseTemplate(selectedTemplate.content).filter(p => p.type !== 'text').map((part, idx) => {
                    let isVisible = true;
                    if (part.condition) {
                      const currentVal = (templateValues[part.condition.parentId] || "").toLowerCase().trim();
                      isVisible = currentVal === part.condition.value;
                    }
                    if (!isVisible) return null;
                    return (
                      <div key={idx} className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{part.displayName}</label>
                        {part.type === 'select' ? (
                          <div className="flex flex-wrap gap-2">
                            {part.options.map((opt: any) => (
                              <button key={opt} onClick={() => { setTemplateValues(prev => ({ ...prev, [part.id]: opt })); setAiFixedText(null); }} 
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${templateValues[part.id] === opt ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-300'}`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10" value={templateValues[part.id] || ''} onChange={(e) => { setTemplateValues(prev => ({ ...prev, [part.id]: e.target.value })); setAiFixedText(null); }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CONSOLE OUTPUT */}
              <div className="bg-[#0f172a] rounded-3xl flex flex-col overflow-hidden border border-slate-800 shadow-2xl relative">
                <div className="p-6 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/50">
                  <span className="text-emerald-500/50 text-[10px] font-bold uppercase tracking-widest font-mono">Tulos / Konsoli</span>
                  <div className="flex gap-2">
                    <button onClick={handleAICheck} disabled={isChecking || !generateFinalText}
                      className={`px-4 py-2 rounded-xl border text-[10px] font-bold transition-all flex items-center gap-2 ${aiFixedText ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-blue-400 border-slate-700 hover:bg-slate-700'}`}>
                      {isChecking ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {aiFixedText ? 'TARKISTETTU' : 'TARKISTA KIELI'}
                    </button>
                    <button onClick={handleCopy} className={`px-6 py-2 rounded-xl border text-[10px] font-bold transition-all ${copied ? 'bg-emerald-500 text-slate-900 shadow-lg' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                      {copied ? 'KOPIOITU!' : 'KOPIOI'}
                    </button>
                  </div>
                </div>
                <div className="p-8 flex-1 overflow-y-auto text-emerald-400/90 font-mono text-sm leading-relaxed whitespace-pre-wrap no-scrollbar">
                  {isChecking ? <div className="flex items-center gap-3 text-slate-500 italic animate-pulse font-sans"><Bot size={18} /> Optimoidaan kielioppia...</div> : generateFinalText || <span className="text-slate-700 italic">Täytä valinnat...</span>}
                </div>
                {aiFixedText && (
                  <div className="absolute bottom-4 left-4 right-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-xl text-[10px] text-blue-300 flex items-center gap-2">
                    <Bot size={14} /> Teksti optimoitu.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">Valitse malli listasta</div>
          )}
        </div>
      </div>

      {/* HELP MODAL */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border">
            <div className="p-6 border-b bg-blue-50 flex justify-between items-center text-blue-700">
              <div className="flex items-center gap-2 font-bold"><Sparkles size={20} /> AI-Generointi Ohje</div>
              <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-blue-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6 text-sm text-slate-600 leading-relaxed">
              <p>AI muuttaa tavallisen tekstin älykkääksi malliksi automaattisesti.</p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-[10px] space-y-2">
                <div className="text-slate-400 italic">Esimerkki syötteestä:</div>
                <div className="text-slate-800">"Potilas on tajuissaan tai unelias. Verenpaine on 120/80."</div>
                <div className="text-emerald-600 pt-2">AI muuttaa sen muotoon:</div>
                <div className="text-emerald-800">"Potilas on {"{{taju:select:tajuissaan,unelias}}"}. RR on {"{{paine}}"}. "</div>
              </div>
              <ul className="space-y-2 list-disc pl-4 text-xs">
                <li>AI tunnistaa automaattisesti valinnat (Chips) ja tekstikentät.</li>
                <li>Se kääntää termit tarvittaessa ammattikielelle.</li>
              </ul>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setShowHelp(false)} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100">SELVÄ!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
