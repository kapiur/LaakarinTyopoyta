"use client";
import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, FileText, Trash2, ChevronRight, 
  Copy, Check, Share2, Loader2, X, RefreshCcw, Edit2
} from 'lucide-react';

export default function TemplatesPage() {
  const [categories, setCategories] = useState<any[]>([]); // Это КАТЕГОРИИ шаблонов (Mallit), а не лекарства!
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    id: null as number | null,
    title: '',
    content: '',
    categoryName: '',
    author: ''
  });

  useEffect(() => { fetchTemplates(); }, []);
  useEffect(() => { setTemplateValues({}); }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      // Запрос к API шаблонов
      const res = await fetch('/api/templates');
      const data = await res.json();
      const validData = Array.isArray(data) ? data : [];
      setCategories(validData); // Теперь здесь будут разделы типа "Anestesia", "Kipupoli" и т.д.
      
      if (validData.length > 0 && activeCategoryId === null) {
        setActiveCategoryId(validData[0].id);
      }
    } catch (err) {
      console.error("Latausvirhe:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content || !formData.categoryName) {
      alert("Täytä kaikki pakolliset kentät");
      return;
    }
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const res = await fetch('/api/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsAdding(false);
        setIsEditing(false);
        setFormData({ id: null, title: '', content: '', categoryName: '', author: '' });
        fetchTemplates();
      }
    } catch (err) {
      alert("Tallennus epäonnistui");
    }
  };

  const deleteCategory = async (id: number, name: string) => {
    if (!confirm(`Haluatko varmasti poistaa osion "${name}" ja KAIKKI sen mallit?`)) return;
    try {
      await fetch(`/api/templates?id=${id}&type=category`, { method: 'DELETE' });
      fetchTemplates();
      setActiveCategoryId(null);
      setSelectedTemplate(null);
    } catch (err) {
      alert("Poisto epäonnistui");
    }
  };

  const generateFinalText = useMemo(() => {
    if (!selectedTemplate?.content) return "";
    return selectedTemplate.content.replace(/{{(.*?)}}/g, (match: string, p1: string) => {
      const id = p1.split(':')[0];
      return templateValues[id] || `[${id}]`;
    });
  }, [selectedTemplate, templateValues]);

  // Фильтрация шаблонов внутри выбранной категории
  const activeCategory = categories.find(c => c.id === activeCategoryId);
  const displayedTemplates = useMemo(() => {
    if (!activeCategory?.templates) return []; 
    return activeCategory.templates.filter((t: any) => 
      t.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeCategory, searchTerm]);

  const parseTemplate = (content: string) => {
    const parts = [];
    const regex = /{{(.*?)}}/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
      }
      const config = match[1].split(':');
      parts.push({ 
        type: config[1] || 'input', 
        id: config[0], 
        options: config[2] ? config[2].split(',') : [] 
      });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) parts.push({ type: 'text', value: content.slice(lastIndex) });
    return parts;
  };

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-4 p-4 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Tekstimallit</h1>
          <p className="text-slate-400 text-sm font-medium italic">Käytä ja hallitse osastokohtaisia kirjauksia</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setIsEditing(false); setFormData({id:null, title:'', content:'', categoryName:'', author:''}); }}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all uppercase tracking-widest"
        >
          + Uusi malli
        </button>
      </div>

      {/* CATEGORIES (ВЕРХНИЕ КНОПКИ) */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-2 flex-shrink-0">
        {loading ? (
           <div className="flex gap-2 animate-pulse">
             {[1,2,3].map(i => <div key={i} className="w-24 h-10 bg-slate-100 rounded-xl"></div>)}
           </div>
        ) : categories.map(cat => (
          <div key={cat.id} className="group relative">
            <button 
              onClick={() => { setActiveCategoryId(cat.id); setSelectedTemplate(null); }}
              className={`px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border whitespace-nowrap ${
                activeCategoryId === cat.id 
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'
              }`}
            >
              {cat.name}
            </button>
            <button 
              onClick={() => deleteCategory(cat.id, cat.name)}
              className="absolute -top-1 -right-1 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white shadow-sm"
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 pb-4 overflow-hidden">
        
        {/* LEFT LIST PANEL */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="relative flex-shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text"
              placeholder="Hae tästä osiosta..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl outline-none font-bold text-slate-400 text-sm shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2 no-scrollbar">
            {displayedTemplates.map((t: any) => (
              <button 
                key={t.id}
                onClick={() => { setSelectedTemplate(t); setIsAdding(false); setIsEditing(false); }}
                className={`w-full text-left p-4 rounded-2xl transition-all border ${
                  selectedTemplate?.id === t.id 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                    : 'bg-white border-slate-50 hover:border-blue-100 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-[11px] uppercase tracking-tight truncate">{t.title}</span>
                  <ChevronRight size={14} className={selectedTemplate?.id === t.id ? 'text-white' : 'text-slate-200'} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT WORK PANEL */}
        <div className="col-span-9 min-h-0">
          {selectedTemplate ? (
            <div className="grid grid-cols-2 h-full gap-8">
              {/* CONSTRUCTOR */}
              <div className="bg-white rounded-[2.5rem] border shadow-sm flex flex-col overflow-hidden">
                <div className="p-8 border-b bg-slate-50/30 flex justify-between items-center">
                  <h3 className="font-black text-slate-800 uppercase italic tracking-tighter">Muuttujat</h3>
                  <div className="flex gap-1">
                    <button onClick={() => { if(confirm("Poista?")) fetch(`/api/templates?id=${selectedTemplate.id}`, {method:'DELETE'}).then(()=>fetchTemplates()) }} className="p-2 text-slate-300 hover:text-red-600"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="p-10 flex-1 overflow-y-auto no-scrollbar space-y-8">
                  {parseTemplate(selectedTemplate.content).filter(p => p.type !== 'text').map((part, idx) => (
                    <div key={idx} className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{part.id}</label>
                      {part.type === 'select' ? (
                        <div className="flex flex-wrap gap-2">
                          {part.options.map((opt: any) => (
                            <button 
                              key={opt} 
                              onClick={() => setTemplateValues(prev => ({ ...prev, [part.id]: opt }))} 
                              className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                templateValues[part.id] === opt ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold text-blue-600" value={templateValues[part.id] || ''} onChange={(e) => setTemplateValues(prev => ({ ...prev, [part.id]: e.target.value }))} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* CONSOLE VIEW */}
              <div className="bg-[#0f172a] rounded-[2.5rem] flex flex-col overflow-hidden border border-slate-800 shadow-2xl">
                <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                  <span className="text-emerald-500/50 text-[10px] font-black uppercase tracking-[0.3em]">Valmis Teksti</span>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(generateFinalText); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
                    className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all border ${copied ? 'bg-emerald-500 text-slate-900 border-emerald-500' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}
                  >
                    {copied ? 'Kopioitu' : 'Kopioi'}
                  </button>
                </div>
                <div className="p-10 flex-1 overflow-y-auto text-emerald-400/90 font-mono text-[11px] leading-relaxed whitespace-pre-wrap no-scrollbar">
                  {generateFinalText || "Valitse malli..."}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-white/50 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex items-center justify-center">
              <p className="text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">Valitse kategoria ja malli</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
