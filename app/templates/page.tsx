"use client";
import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, FileText, Trash2, ChevronRight, 
  Copy, Check, Clock, User, Share2, Loader2, X, RefreshCcw, Edit2
} from 'lucide-react';

export default function TemplatesPage() {
  const [categories, setCategories] = useState<any[]>([]);
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
      const res = await fetch('/api/templates');
      const data = await res.json();
      const validData = Array.isArray(data) ? data : [];
      setCategories(validData);
      if (validData.length > 0 && !activeCategoryId) {
        setActiveCategoryId(validData[0].id);
      }
    } catch (err) {
      console.error("Latausvirhe:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- ЛОГИКА КОПИРОВАНИЯ (Исправленная) ---
  const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Стили, чтобы textarea не была видна
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Kopiointi epäonnistui. Kopioi teksti manuaalisesti.");
    }
    document.body.removeChild(textArea);
  };

  const handleCopy = () => {
    if (!generateFinalText) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(generateFinalText)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => fallbackCopy(generateFinalText));
    } else {
      fallbackCopy(generateFinalText);
    }
  };

  // --- ОСТАЛЬНАЯ ЛОГИКА ---
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

  const startEditing = (template: any) => {
    const category = categories.find(c => c.id === template.categoryId);
    setFormData({
      id: template.id,
      title: template.title,
      content: template.content,
      categoryName: category?.name || '',
      author: template.author || ''
    });
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleShare = async (templateId: number, title: string) => {
    const targetEmail = window.prompt(`Jaa malli "${title}"\nSyötä vastaanottajan sähköposti:`);
    if (!targetEmail) return;
    try {
      const res = await fetch('/api/templates/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, targetEmail: targetEmail.toLowerCase().trim() })
      });
      const data = await res.json();
      if (data.success) alert("Malli kopioitu kollegalle!");
      else alert("Virhe: " + (data.error || "Epäonnistui"));
    } catch (err) {
      alert("Yhteysvirhe.");
    }
  };

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

  const generateFinalText = useMemo(() => {
    if (!selectedTemplate) return "";
    return selectedTemplate.content.replace(/{{(.*?)}}/g, (match: string, p1: string) => {
      const id = p1.split(':')[0];
      return templateValues[id] || `[${id}]`;
    });
  }, [selectedTemplate, templateValues]);

  const activeCategory = categories.find(c => c.id === activeCategoryId);
  const displayedTemplates = activeCategory?.templates.filter((t: any) => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border shadow-sm flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tekstimallit</h1>
          <p className="text-slate-500 text-sm">Hallitse ja käytä omia tekstipohjiasi</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setIsEditing(false); setFormData({id:null, title:'', content:'', categoryName:'', author:''}); }}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          + UUSI MALLI
        </button>
      </div>

      {/* CATEGORIES */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1 flex-shrink-0">
        {categories.map(cat => (
          <div key={cat.id} className="group relative">
            <button 
              onClick={() => { setActiveCategoryId(cat.id); setSelectedTemplate(null); }}
              className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all border whitespace-nowrap ${
                activeCategoryId === cat.id 
                ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
              }`}
            >
              {cat.name}
            </button>
            <button 
              onClick={() => deleteCategory(cat.id, cat.name)}
              className="absolute -top-2 -right-1 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white shadow-sm"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 pb-4 overflow-hidden">
        
        {/* LEFT PANEL */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="relative flex-shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Hae..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2 no-scrollbar">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600" /></div>
            ) : displayedTemplates.map((t: any) => (
              <button 
                key={t.id}
                onClick={() => { setSelectedTemplate(t); setIsAdding(false); setIsEditing(false); }}
                className={`w-full text-left p-4 rounded-2xl transition-all border ${
                  selectedTemplate?.id === t.id 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                    : 'bg-white border-slate-100 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm truncate">{t.title}</span>
                  <ChevronRight size={14} className={selectedTemplate?.id === t.id ? 'text-white' : 'text-slate-300'} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="col-span-9 min-h-0">
          {(isAdding || isEditing) ? (
            <div className="bg-white h-full rounded-3xl border shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Muokkaa mallia' : 'Uusi tekstipohja'}</h2>
                <button onClick={() => {setIsAdding(false); setIsEditing(false);}} className="p-2 hover:bg-slate-200 rounded-full"><X /></button>
              </div>
              <div className="p-8 flex-1 overflow-y-auto space-y-4 no-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Otsikko" className="p-4 bg-slate-50 border rounded-2xl outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  <input placeholder="Kategoria" className="p-4 bg-slate-50 border rounded-2xl outline-none" value={formData.categoryName} onChange={e => setFormData({...formData, categoryName: e.target.value})} />
                </div>
                <textarea placeholder="Sisältö..." className="w-full p-6 bg-slate-50 border rounded-2xl font-mono text-sm min-h-[400px] outline-none" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
              </div>
              <div className="p-8 border-t bg-slate-50/30 flex gap-4">
                <button onClick={handleSave} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700">TALLENNA</button>
              </div>
            </div>
          ) : selectedTemplate ? (
            <div className="grid grid-cols-2 h-full gap-6">
              <div className="bg-white rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">Valinnat</h3>
                  <div className="flex gap-1">
                    <button onClick={() => startEditing(selectedTemplate)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={18} /></button>
                    <button onClick={() => handleShare(selectedTemplate.id, selectedTemplate.title)} className="p-2 text-slate-400 hover:text-blue-600"><Share2 size={18} /></button>
                    <button onClick={() => { if(confirm("Poista?")) fetch(`/api/templates?id=${selectedTemplate.id}`, {method:'DELETE'}).then(()=>fetchTemplates()) }} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="p-6 flex-1 overflow-y-auto no-scrollbar space-y-6">
                  {parseTemplate(selectedTemplate.content).filter(p => p.type !== 'text').map((part, idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{part.id}</label>
                      {part.type === 'select' ? (
                        <div className="flex flex-wrap gap-2">
                          {part.options.map((opt: any) => (
                            <button 
                              key={opt} 
                              onClick={() => setTemplateValues(prev => ({ ...prev, [part.id]: opt }))} 
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                templateValues[part.id] === opt 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input 
                          type="text" 
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" 
                          value={templateValues[part.id] || ''} 
                          onChange={(e) => setTemplateValues(prev => ({ ...prev, [part.id]: e.target.value }))} 
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* RESULT AREA */}
              <div className="bg-[#1e293b] rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-slate-800 relative">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Lopputulos</span>
                  <button 
                    onClick={handleCopy} 
                    className={`px-6 py-2 rounded-xl border transition-all text-xs font-bold ${
                      copied 
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
                  >
                    {copied ? 'KOPIOITU!' : 'KOPIOI'}
                  </button>
                </div>
                <div className="p-8 flex-1 overflow-y-auto text-emerald-400/90 font-mono text-sm leading-relaxed whitespace-pre-wrap no-scrollbar">
                  {generateFinalText || "Täytä valinnat..."}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-300">
              Valitse malli tästä osiosta
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
