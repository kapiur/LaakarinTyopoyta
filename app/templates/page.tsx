"use client";
import { useState, useEffect } from 'react';
import { 
  Plus, Search, FileText, Trash2, ChevronRight, 
  Copy, Check, Clock, User, Share2, Loader2, X 
} from 'lucide-react';

export default function TemplatesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  const [newTemplate, setNewTemplate] = useState({
    title: '',
    content: '',
    categoryName: '',
    author: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
      // Авто-выбор первого шаблона для красоты, если ничего не выбрано
      if (Array.isArray(data) && data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0].templates[0]);
      }
    } catch (err) {
      console.error("Latausvirhe:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDelete = async (id: number) => {
    if (!confirm("Haluatko varmasti poistaa tämän mallin?")) return;
    try {
      await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
      fetchTemplates();
      if (selectedTemplate?.id === id) setSelectedTemplate(null);
    } catch (err) {
      alert("Poisto epäonnistui");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const filteredCategories = categories.map(cat => ({
    ...cat,
    templates: cat.templates.filter((t: any) => 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.templates.length > 0);

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-80px)] flex flex-col gap-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border shadow-sm flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tekstimallit</h1>
          <p className="text-slate-500 text-sm">Hallitse ja käytä omia tekstipohjiasi</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setSelectedTemplate(null); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={20} />
          <span>UUSI MALLI</span>
        </button>
      </div>

      {/* GRID LAYOUT */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 pb-6">
        
        {/* LEFT COLUMN (4/12) */}
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Hae..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-6 no-scrollbar">
            {loading ? (
              <div className="flex justify-center py-10 text-blue-600"><Loader2 className="animate-spin" /></div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic">Ei tuloksia</div>
            ) : filteredCategories.map(cat => (
              <div key={cat.id} className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-3">{cat.name}</h3>
                <div className="space-y-1.5">
                  {cat.templates.map((t: any) => (
                    <button 
                      key={t.id}
                      onClick={() => { setSelectedTemplate(t); setIsAdding(false); }}
                      className={`w-full text-left p-4 rounded-2xl transition-all border ${
                        selectedTemplate?.id === t.id 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                          : 'bg-white border-slate-100 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText size={18} className={selectedTemplate?.id === t.id ? 'text-blue-100' : 'text-blue-600'} />
                          <span className="font-bold text-sm truncate">{t.title}</span>
                        </div>
                        <ChevronRight size={16} className={selectedTemplate?.id === t.id ? 'text-white' : 'text-slate-300'} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN (8/12) */}
        <div className="col-span-8 min-h-0">
          {isAdding ? (
            <div className="bg-white h-full rounded-3xl border shadow-sm flex flex-col overflow-hidden">
              <div className="p-8 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900"><Plus className="text-blue-600" /> Luo uusi malli</h2>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>
              <div className="p-8 flex-1 overflow-y-auto space-y-4 no-scrollbar">
                <input 
                  placeholder="Otsikko (esim. Polvi-status)"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTemplate.title}
                  onChange={e => setNewTemplate({...newTemplate, title: e.target.value})}
                />
                <input 
                  placeholder="Kategoria (esim. Kirurgia)"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTemplate.categoryName}
                  onChange={e => setNewTemplate({...newTemplate, categoryName: e.target.value})}
                />
                <textarea 
                  placeholder="Kirjoita tekstipohja tähän..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm min-h-[400px]"
                  value={newTemplate.content}
                  onChange={e => setNewTemplate({...newTemplate, content: e.target.value})}
                />
              </div>
              <div className="p-8 border-t bg-slate-50/50 flex gap-4">
                <button onClick={handleSave} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-md">TALLENNA MALLI</button>
                <button onClick={() => setIsAdding(false)} className="flex-1 py-4 bg-white border text-slate-600 rounded-2xl font-bold hover:bg-slate-50">PERUUTA</button>
              </div>
            </div>
          ) : selectedTemplate ? (
            <div className="bg-white h-full rounded-3xl border shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-300">
              {/* CONTENT HEADER */}
              <div className="p-8 border-b bg-slate-50/30 flex justify-between items-start flex-shrink-0">
                <div>
                  <div className="flex gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                      {categories.find(c => c.id === selectedTemplate.categoryId)?.name}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedTemplate.title}</h2>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleShare(selectedTemplate.id, selectedTemplate.title)} 
                    className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" 
                    title="Jaa kollegalle"
                  >
                    <Share2 size={22} />
                  </button>
                  <button 
                    onClick={() => handleDelete(selectedTemplate.id)} 
                    className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              </div>

              {/* TEXT AREA */}
              <div className="p-8 flex-1 overflow-y-auto no-scrollbar">
                <div className="bg-[#1e293b] rounded-3xl p-8 text-emerald-400 font-mono text-sm leading-relaxed relative group shadow-2xl">
                  <pre className="whitespace-pre-wrap">{selectedTemplate.content}</pre>
                  <button 
                    onClick={() => handleCopy(selectedTemplate.content)}
                    className="absolute top-6 right-6 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white backdrop-blur-md border border-white/10 shadow-xl"
                  >
                    {copied ? <Check size={20} className="text-emerald-400" /> : <Copy size={20} />}
                  </button>
                </div>
                
                {/* FOOTER INFO */}
                <div className="flex items-center gap-8 text-slate-400 text-xs font-semibold mt-8 pt-8 border-t border-slate-100">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <Clock size={14}/> 
                    <span>{new Date(selectedTemplate.createdAt).toLocaleDateString('fi-FI')}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <User size={14}/> 
                    <span>{selectedTemplate.author || 'Oma malli'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl bg-white/50">
              <FileText size={64} className="mb-4 opacity-20" />
              <p className="font-semibold">Valitse tekstimalli listasta aloittaaksesi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
