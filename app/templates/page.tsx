"use client";
import { useState, useEffect, useMemo } from 'react';
import { useSession } from "next-auth/react";
import { 
  Plus, Search, Trash2, ChevronRight, 
  Copy, Check, Loader2, X, Edit2
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

  const [formData, setFormData] = useState({
    id: null as number | null,
    title: '',
    content: '',
    categoryName: '',
    author: ''
  });

  useEffect(() => { fetchTemplates(); }, []);
  
  // Сброс значений при выборе нового шаблона
  useEffect(() => { 
    setTemplateValues({}); 
  }, [selectedTemplate]);

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

  // УЛУЧШЕННЫЙ ПАРСЕР
  const parseTemplate = (content: string) => {
    const parts = [];
    const regex = /{{(.*?)}}/g;
    let lastIndex = 0, match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
      }

      const rawConfig = match[1];
      const config = rawConfig.split(':');
      const id = config[0].trim();
      
      const showIfCond = config.find(c => c.trim().startsWith('showIf'));
      let condition = null;
      
      if (showIfCond) {
        const condMatch = showIfCond.match(/showIf:([\w-]+)=([\w,а-яА-Я-]+)/);
        if (condMatch) {
          condition = { parentId: condMatch[1], value: condMatch[2] };
        }
      }

      parts.push({ 
        type: config.includes('select') ? 'select' : 'input', 
        id: id, 
        options: config.find(c => c.includes(','))?.split(',').map(o => o.trim()) || [],
        condition,
        raw: rawConfig 
      });

      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) parts.push({ type: 'text', value: content.slice(lastIndex) });
    return parts;
  };

  // УМНЫЙ ГЕНЕРАТОР ТЕКСТА
  const generateFinalText = useMemo(() => {
    if (!selectedTemplate) return "";
    
    const parsed = parseTemplate(selectedTemplate.content);
    let result = "";

    parsed.forEach(part => {
      if (part.type === 'text') {
        result += part.value;
      } else {
        let visible = true;
        if (part.condition) {
          // Важно: сравниваем значение родителя из templateValues
          visible = templateValues[part.condition.parentId] === part.condition.value;
        }
        
        if (visible) {
          const val = templateValues[part.id];
          result += val || `[${part.id}]`;
        }
      }
    });

    // Очистка: удаляем лишние пробелы и точки перед скрытыми блоками
    return result.replace(/[ ]{2,}/g, ' ').replace(/\s+\./g, '.').trim();
  }, [selectedTemplate, templateValues]);

  const handleCopy = () => {
    if (!generateFinalText) return;
    navigator.clipboard.writeText(generateFinalText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim() || !formData.categoryName.trim()) {
      alert("Täytä kaikki pakolliset kentät.");
      return;
    }
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const res = await fetch('/api/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, author: session?.user?.email || 'Doc' }),
      });
      if (res.ok) {
        setIsAdding(false); setIsEditing(false);
        setFormData({ id: null, title: '', content: '', categoryName: '', author: '' });
        fetchTemplates();
      }
    } catch (err) { alert("Virhe tallennettaessa."); }
  };

  const startEditing = (template: any) => {
    const category = categories.find(c => c.id === template.categoryId);
    setFormData({
      id: template.id, title: template.title, content: template.content,
      categoryName: category?.name || '', author: template.author || ''
    });
    setIsEditing(true);
  };

  const activeCategory = categories.find(c => c.id === activeCategoryId);
  const displayedTemplates = activeCategory?.templates 
    ? activeCategory.templates.filter((t: any) => t.title.toLowerCase().includes(searchTerm.toLowerCase())) 
    : [];

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-6 p-4">
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Tekstimallit</h1>
        <button onClick={() => { setIsAdding(true); setIsEditing(false); }} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100">
          + UUSI MALLI
        </button>
      </div>

      {/* CATEGORIES */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {categories.map(cat => (
          <button key={cat.id} onClick={() => { setActiveCategoryId(cat.id); setSelectedTemplate(null); }}
            className={`px-6 py-3 rounded-2xl font-bold text-sm border whitespace-nowrap transition-all ${activeCategoryId === cat.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}>
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        {/* SIDEBAR */}
        <div className="col-span-3 flex flex-col gap-4 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input placeholder="Hae..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
            {displayedTemplates.map((t: any) => (
              <button key={t.id} onClick={() => setSelectedTemplate(t)} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedTemplate?.id === t.id ? 'bg-blue-600 text-white' : 'bg-white border-slate-100'}`}>
                <span className="font-bold text-sm truncate block">{t.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* MAIN AREA */}
        <div className="col-span-9 overflow-hidden">
          {(isAdding || isEditing) ? (
            <div className="bg-white h-full rounded-3xl border shadow-sm flex flex-col overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">{isEditing ? 'Muokkaa' : 'Uusi'}</h2>
                <button onClick={() => {setIsAdding(false); setIsEditing(false);}}><X /></button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                <input placeholder="Otsikko" className="w-full p-4 bg-slate-50 border rounded-2xl" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                <input placeholder="Kategoria" className="w-full p-4 bg-slate-50 border rounded-2xl" value={formData.categoryName} onChange={e => setFormData({...formData, categoryName: e.target.value})} />
                <textarea placeholder="Sisältö {{id:select:a,b}}" className="w-full p-4 bg-slate-50 border rounded-2xl font-mono text-sm h-64" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
                <button onClick={handleSave} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">TALLENNA</button>
              </div>
            </div>
          ) : selectedTemplate ? (
            <div className="grid grid-cols-2 h-full gap-6">
              {/* INTERFACE PANEL */}
              <div className="bg-white rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Valinnat</span>
                  <div className="flex gap-2">
                    <button onClick={() => startEditing(selectedTemplate)} className="text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                  </div>
                </div>
                <div className="p-6 flex-1 overflow-y-auto no-scrollbar space-y-6">
                  {parseTemplate(selectedTemplate.content)
                    .filter(p => p.type !== 'text')
                    .map((part, idx) => {
                      // ПРОВЕРКА ВИДИМОСТИ
                      if (part.condition) {
                        const parentVal = templateValues[part.condition.parentId];
                        if (parentVal !== part.condition.value) return null;
                      }

                      return (
                        <div key={idx} className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{part.id}</label>
                          {part.type === 'select' ? (
                            <div className="flex flex-wrap gap-2">
                              {part.options.map((opt: any) => (
                                <button 
                                  key={opt} 
                                  onClick={() => setTemplateValues(prev => ({ ...prev, [part.id]: opt }))} 
                                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${templateValues[part.id] === opt ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:border-blue-300'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <input 
                              className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white" 
                              value={templateValues[part.id] || ''} 
                              onChange={(e) => setTemplateValues(prev => ({ ...prev, [part.id]: e.target.value }))} 
                            />
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* CONSOLE PANEL */}
              <div className="bg-[#0f172a] rounded-3xl flex flex-col overflow-hidden border border-slate-800 shadow-2xl">
                <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/50">
                  <span className="text-emerald-500/50 text-[10px] font-bold uppercase tracking-widest font-mono">Tulos / Konsoli</span>
                  <button onClick={handleCopy} className={`px-4 py-2 rounded-xl border transition-all text-xs font-bold ${copied ? 'bg-emerald-500 text-slate-900' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    {copied ? 'KOPIOITU!' : 'KOPIOI'}
                  </button>
                </div>
                <div className="p-8 flex-1 overflow-y-auto text-emerald-400/90 font-mono text-sm leading-relaxed whitespace-pre-wrap no-scrollbar">
                  {generateFinalText || "Valitse asetukset..."}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase text-xs border-2 border-dashed rounded-3xl">Valitse malli</div>
          )}
        </div>
      </div>
    </div>
  );
}
