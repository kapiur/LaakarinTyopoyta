"use client";
import { useState, useEffect } from 'react';
import { 
  Plus, Search, FileText, Trash2, ChevronRight, 
  Copy, Check, Clock, User, Share2, Loader2 
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
    } catch (err) {
      console.error("Virhe ladattaessa malleja:", err);
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

  // --- НОВАЯ ФУНКЦИЯ: ПОДЕЛИТЬСЯ ---
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

      if (data.success) {
        alert("Malli kopioitu onnistuneesti kollegalle!");
      } else {
        alert("Virhe: " + (data.error || "Jakaminen epäonnistui"));
      }
    } catch (err) {
      alert("Yhteysvirhe palvelimeen.");
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
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tekstimallit</h1>
          <p className="text-slate-500 text-sm">Hallitse ja käytä kliinisiä tekstipohjia</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200"
        >
          <Plus size={20} />
          <span>UUSI MALLI</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: LIST */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Hae malleja..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 no-scrollbar">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600" /></div>
            ) : filteredCategories.map(cat => (
              <div key={cat.id} className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">{cat.name}</h3>
                {cat.templates.map((t: any) => (
                  <div 
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className={`group p-4 rounded-2xl cursor-pointer transition-all border ${
                      selectedTemplate?.id === t.id 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md translate-x-1' 
                        : 'bg-white border-slate-100 hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className={selectedTemplate?.id === t.id ? 'text-blue-100' : 'text-blue-600'} />
                        <span className="font-bold text-sm truncate max-w-[180px]">{t.title}</span>
                      </div>
                      <ChevronRight size={16} className={`transition-transform ${selectedTemplate?.id === t.id ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: EDITOR / VIEW */}
        <div className="lg:col-span-8 h-full">
          {isAdding ? (
            <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold flex items-center gap-2"><Plus className="text-blue-600" /> Luo uusi malli</h2>
              <div className="grid gap-4">
                <input 
                  placeholder="Mallin otsikko (esim. Polvi-status)"
                  className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTemplate.title}
                  onChange={e => setNewTemplate({...newTemplate, title: e.target.value})}
                />
                <input 
                  placeholder="Kategoria (esim. Kirurgia)"
                  className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTemplate.categoryName}
                  onChange={e => setNewTemplate({...newTemplate, categoryName: e.target.value})}
                />
                <textarea 
                  placeholder="Mallin sisältö..."
                  rows={12}
                  className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  value={newTemplate.content}
                  onChange={e => setNewTemplate({...newTemplate, content: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={handleSave} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all">TALLENNA</button>
                <button onClick={() => setIsAdding(false)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">PERUUTA</button>
              </div>
            </div>
          ) : selectedTemplate ? (
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-8 border-b bg-slate-50/50 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                      {categories.find(c => c.id === selectedTemplate.categoryId)?.name}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedTemplate.title}</h2>
                </div>
                <div className="flex gap-2">
                  {/* КНОПКА ПОДЕЛИТЬСЯ */}
                  <button 
                    onClick={() => handleShare(selectedTemplate.id, selectedTemplate.title)}
                    className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="Jaa kollegalle"
                  >
                    <Share2 size={20} />
                  </button>
                  <button 
                    onClick={() => handleDelete(selectedTemplate.id)}
                    className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="bg-slate-900 rounded-2xl p-6 text-emerald-400 font-mono text-sm leading-relaxed relative group">
                  <pre className="whitespace-pre-wrap">{selectedTemplate.content}</pre>
                  <button 
                    onClick={() => handleCopy(selectedTemplate.content)}
                    className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white backdrop-blur-sm"
                  >
                    {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                </div>
                <div className="flex items-center gap-6 text-slate-400 text-xs font-medium border-t pt-6">
                  <div className="flex items-center gap-2"><Clock size={14}/> <span>{new Date(selectedTemplate.createdAt).toLocaleDateString('fi-FI')}</span></div>
                  <div className="flex items-center gap-2"><User size={14}/> <span>{selectedTemplate.author || 'Oma malli'}</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl">
              <div className="bg-slate-50 p-6 rounded-full mb-4"><FileText size={48} /></div>
              <p className="font-medium">Valitse malli listasta tai luo uusi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
