"use client";
import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, FileText, Trash2, ChevronRight, 
  Copy, Check, Clock, User, Share2, Loader2, X, RefreshCcw
} from 'lucide-react';

export default function TemplatesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Состояние для значений конструктора
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});

  const [newTemplate, setNewTemplate] = useState({
    title: '',
    content: '',
    categoryName: '',
    author: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Сбрасываем значения конструктора при смене шаблона
  useEffect(() => {
    setTemplateValues({});
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Latausvirhe:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- ЛОГИКА КОНСТРУКТОРА ---
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
      const id = config[0];
      const type = config[1] || 'input';
      const options = config[2] ? config[2].split(',') : [];

      parts.push({ type, id, options });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', value: content.slice(lastIndex) });
    }

    return parts;
  };

  const generateFinalText = useMemo(() => {
    if (!selectedTemplate) return "";
    return selectedTemplate.content.replace(/{{(.*?)}}/g, (match: string, p1: string) => {
      const id = p1.split(':')[0];
      return templateValues[id] || `[${id}]`;
    });
  }, [selectedTemplate, templateValues]);

  const renderConstructor = (content: string) => {
    const parts = parseTemplate(content);
    return (
      <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-inner">
        <div className="grid grid-cols-1 gap-4">
          {parts.filter(p => p.type !== 'text').map((part, idx) => (
            <div key={idx} className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{part.id}</label>
              {part.type === 'select' ? (
                <div className="flex flex-wrap gap-2">
                  {part.options.map((opt: string) => (
                    <button
                      key={opt}
                      onClick={() => setTemplateValues(prev => ({ ...prev, [part.id]: opt }))}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
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
                  placeholder={`Kirjoita ${part.id}...`}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                  value={templateValues[part.id] || ''}
                  onChange={(e) => setTemplateValues(prev => ({ ...prev, [part.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- API ФУНКЦИИ ---
  const handleSave = async () => {
    if (!newTemplate.title || !newTemplate.content || !newTemplate.categoryName) {
      alert("Täytä kaikki pakolliset kentät");
      return;
    }
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });
      if (res.ok) {
        setIsAdding(false);
        setNewTemplate({ title: '', content: '', categoryName: '', author: '' });
        fetchTemplates();
      }
    } catch (err) {
      alert("Tallennus epäonnistui");
    }
  };

  const handleShare = async (templateId: number, title: string) => {
    const targetEmail = window.prompt(`Jaa malli "${title}"\n\nSyötä vastaanottajan sähköposti:`);
    if (!targetEmail) return;
    try {
      const res = await fetch('/api/templates/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, targetEmail: targetEmail.toLowerCase().trim() })
      });
      const data = await res.json();
      if (data.success) alert("Malli kopioitu kollegalle!");
      else alert("Virhe: " + (data.error || "Jakaminen epäonnistui"));
    } catch (err) {
      alert("Yhteysvirhe.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateFinalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredCategories = categories.map(cat => ({
    ...cat,
    templates: cat.templates.filter((t: any) => 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.templates.length > 0);

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border shadow-sm flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tekstimallit</h1>
          <p className="text-slate-500 text-sm">Rakenna kliininen teksti valinnoilla</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setSelectedTemplate(null); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={20} />
          <span>UUSI MALLI</span>
        </button>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 pb-4">
        
        {/* LIST PANEL */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Etsi..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-6 no-scrollbar">
            {loading ? (
              <div className="flex justify-center py-10 text-blue-600"><Loader2 className="animate-spin" /></div>
            ) : filteredCategories.map(cat => (
              <div key={cat.id} className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-3">{cat.name}</h3>
                <div className="space-y-1">
                  {cat.templates.map((t: any) => (
                    <button 
                      key={t.id}
                      onClick={() => { setSelectedTemplate(t); setIsAdding(false); }}
                      className={`w-full text-left p-4 rounded-2xl transition-all border ${
                        selectedTemplate?.id === t.id 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                          : 'bg-white border-slate-50 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm truncate pr-2">{t.title}</span>
                        <ChevronRight size={14} className={selectedTemplate?.id === t.id ? 'text-white' : 'text-slate-300'} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WORK AREA PANEL */}
        <div className="col-span-9 min-h-0">
          {isAdding ? (
            <div className="bg-white h-full rounded-3xl border shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-4">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold flex items-center gap-2"><Plus className="text-blue-600" /> Uusi tekstipohja</h2>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              <div className="p-8 flex-1 overflow-y-auto space-y-4 no-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    placeholder="Otsikko"
                    className="p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newTemplate.title}
                    onChange={e => setNewTemplate({...newTemplate, title: e.target.value})}
                  />
                  <input 
                    placeholder="Kategoria"
                    className="p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newTemplate.categoryName}
                    onChange={e => setNewTemplate({...newTemplate, categoryName: e.target.value})}
                  />
                </div>
                <textarea 
                  placeholder="Käytä syntaksia {{id:type:options}}..."
                  className="w-full p-6 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm min-h-[400px]"
                  value={newTemplate.content}
                  onChange={e => setNewTemplate({...newTemplate, content: e.target.value})}
                />
              </div>
              <div className="p-8 border-t flex gap-4">
                <button onClick={handleSave} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold">TALLENNA</button>
              </div>
            </div>
          ) : selectedTemplate ? (
            <div className="grid grid-cols-2 h-full gap-6">
              {/* КОНСТРУКТОР (ЛЕВАЯ ЧАСТЬ ПРАВОЙ ПАНЕЛИ) */}
              <div className="bg-white rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <RefreshCcw size={16} className="text-blue-600" /> Valinnat
                  </h3>
                  <div className="flex gap-1">
                    <button onClick={() => handleShare(selectedTemplate.id, selectedTemplate.title)} className="p-2 text-slate-400 hover:text-blue-600"><Share2 size={18} /></button>
                    <button onClick={() => { if(confirm("Poista?")) fetch(`/api/templates?id=${selectedTemplate.id}`, {method:'DELETE'}).then(()=>fetchTemplates()) }} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
                  {renderConstructor(selectedTemplate.content)}
                </div>
              </div>

              {/* РЕЗУЛЬТАТ (ПРАВАЯ ЧАСТЬ ПРАВОЙ ПАНЕЛИ) */}
              <div className="bg-[#1e293b] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-800">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Lopputulos</span>
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all border border-emerald-500/20"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span className="text-xs font-bold">{copied ? 'KOPIOITU' : 'KOPIOI'}</span>
                  </button>
                </div>
                <div className="p-8 flex-1 overflow-y-auto text-emerald-400/90 font-mono text-sm leading-relaxed whitespace-pre-wrap no-scrollbar">
                  {generateFinalText}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
              <FileText size={48} className="mb-4 opacity-20" />
              <p className="font-medium">Valitse tekstimalli listasta</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
