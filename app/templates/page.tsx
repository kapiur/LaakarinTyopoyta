"use client";
import { useState, useEffect, useMemo } from 'react';
import { useSession } from "next-auth/react"; // Добавили для получения автора
import { 
  Plus, Search, FileText, Trash2, ChevronRight, 
  Copy, Check, Clock, User, Share2, Loader2, X, RefreshCcw, Edit2
} from 'lucide-react';

export default function TemplatesPage() {
  const { data: session } = useSession(); // Получаем данные пользователя
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

  const handleCopy = () => {
    if (!generateFinalText) return;
    navigator.clipboard.writeText(generateFinalText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // --- ИСПРАВЛЕННОЕ СОХРАНЕНИЕ ---
  const handleSave = async () => {
    // Проверка обязательных полей
    if (!formData.title.trim() || !formData.content.trim() || !formData.categoryName.trim()) {
      alert("Täytä kaikki kentät: Otsikko, Kategoria ja Sisältö.");
      return;
    }

    const payload = {
      ...formData,
      author: formData.author || session?.user?.email || 'Nimetön' // Гарантируем наличие автора для БД
    };

    try {
      const method = formData.id ? 'PUT' : 'POST';
      const res = await fetch('/api/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsAdding(false);
        setIsEditing(false);
        setFormData({ id: null, title: '', content: '', categoryName: '', author: '' });
        fetchTemplates();
        alert("Malli tallennettu!");
      } else {
        const errorData = await res.json();
        alert(`Virhe tallennuksessa: ${errorData.error || 'Palvelinvirhe'}`);
      }
    } catch (err) {
      console.error("Save Error:", err);
      alert("Yhteysvirhe tallennettaessa.");
    }
  };

  const deleteCategory = async (id: number, name: string) => {
    if (!confirm(`Poistetaanko "${name}"?`)) return;
    await fetch(`/api/templates?id=${id}&type=category`, { method: 'DELETE' });
    fetchTemplates();
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

  const parseTemplate = (content: string) => {
    const parts = [];
    const regex = /{{(.*?)}}/g;
    let lastIndex = 0, match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
      const config = match[1].split(':');
      parts.push({ type: config[1] || 'input', id: config[0], options: config[2] ? config[2].split(',') : [] });
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
  const displayedTemplates = activeCategory?.templates 
    ? activeCategory.templates.filter((t: any) => t.title.toLowerCase().includes(searchTerm.toLowerCase())) 
    : [];

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border shadow-sm flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tekstimallit</h1>
        <button 
          onClick={() => { setIsAdding(true); setIsEditing(false); setFormData({id:null, title:'', content:'', categoryName:'', author:''}); }}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100"
        >
          + UUSI MALLI
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1 flex-shrink-0">
        {categories.map(cat => (
          <div key={cat.id} className="group relative">
            <button 
              onClick={() => { setActiveCategoryId(cat.id); setSelectedTemplate(null); }}
              className={`px-6 py-3 rounded-2xl font-bold text-sm border whitespace-nowrap ${activeCategoryId === cat.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:border-blue-300'}`}
            >
              {cat.name}
            </button>
            <button onClick={() => deleteCategory(cat.id, cat.name)} className="absolute -top-2 -right-1 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 border-2 border-white shadow-sm"><X size={12} /></button>
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 pb-4 overflow-hidden">
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input placeholder="Hae..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
            {loading ? <Loader2 className="animate-spin mx-auto text-blue-600" /> : displayedTemplates.map((t: any) => (
              <button key={t.id} onClick={() => { setSelectedTemplate(t); setIsAdding(false); setIsEditing(false); }} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedTemplate?.id === t.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white border-slate-50 hover:border-blue-200'}`}>
                <div className="flex items-center justify-between"><span className="font-bold text-sm truncate">{t.title}</span><ChevronRight size={14} className={selectedTemplate?.id === t.id ? 'text-white' : 'text-slate-300'} /></div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-9 min-h-0">
          {(isAdding || isEditing) ? (
            <div className="bg-white h-full rounded-3xl border shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-4">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Muokkaa mallia' : 'Uusi tekstipohja'}</h2>
                <button onClick={() => {setIsAdding(false); setIsEditing(false);}} className="p-2 hover:bg-slate-200 rounded-full"><X /></button>
              </div>
              <div className="p-8 flex-1 overflow-y-auto space-y-4 no-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Otsikko (esm. PCA-aloitus)" className="p-4 bg-slate-50 border rounded-2xl outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  <input placeholder="Kategoria (esm. Anestesia)" className="p-4 bg-slate-50 border rounded-2xl outline-none" value={formData.categoryName} onChange={e => setFormData({...formData, categoryName: e.target.value})} />
                </div>
                <textarea placeholder="Kirjoita sisältö... Käytä {{Nimi:select:val1,val2}} tai {{Nimi:input}} muuttujille." className="w-full p-6 bg-slate-50 border rounded-2xl font-mono text-sm min-h-[400px] outline-none" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
              </div>
              <div className="p-8 border-t bg-slate-50/30">
                <button onClick={handleSave} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all uppercase tracking-widest">Tallenna malli</button>
              </div>
            </div>
          ) : selectedTemplate ? (
            <div className="grid grid-cols-2 h-full gap-6">
              <div className="bg-white rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">Valinnat</h3>
                  <div className="flex gap-1">
                    <button onClick={() => startEditing(selectedTemplate)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={18} /></button>
                    <button onClick={() => { if(confirm("Poista?")) fetch(`/api/templates?id=${selectedTemplate.id}`, {method:'DELETE'}).then(()=>fetchTemplates()) }} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="p-6 flex-1 overflow-y-auto no-scrollbar space-y-6">
                  {parseTemplate(selectedTemplate.content).filter(p => p.type !== 'text').map((part, idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{part.id}</label>
                      {part.type === 'select' ? (
                        <div className="flex flex-wrap gap-2">{part.options.map((opt: any) => (
                          <button key={opt} onClick={() => setTemplateValues(prev => ({ ...prev, [part.id]: opt }))} className={`px-4 py-2 rounded-xl text-xs font-bold border ${templateValues[part.id] === opt ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:border-blue-300'}`}>{opt}</button>
                        ))}</div>
                      ) : (
                        <input className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={templateValues[part.id] || ''} onChange={(e) => setTemplateValues(prev => ({ ...prev, [part.id]: e.target.value }))} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#1e293b] rounded-3xl flex flex-col overflow-hidden border border-slate-800 relative shadow-2xl">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Lopputulos</span>
                  <button onClick={handleCopy} className={`px-6 py-2 rounded-xl border text-xs font-bold ${copied ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-400'}`}>{copied ? 'KOPIOITU!' : 'KOPIOI'}</button>
                </div>
                <div className="p-8 flex-1 overflow-y-auto text-emerald-400/90 font-mono text-sm leading-relaxed whitespace-pre-wrap no-scrollbar">
                  {generateFinalText || "Täytä valinnat..."}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest text-xs">Valitse malli tästä osiosta</div>
          )}
        </div>
      </div>
    </div>
  );
}
