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
    <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col gap-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border shadow-sm flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tekstimallit</h1>
          <p className="text-slate-500 text-sm">Hallitse ja käytä omia tekstipohjiasi</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setSelectedTemplate(null); }}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200"
        >
          <Plus size={20} />
          <span>UUSI MALLI</span>
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {/* LEFT PANEL: LIST */}
        <div className="w-1/3 flex flex-col gap-4 overflow-hidden">
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

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600" /></div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm italic">Ei malleja löytynyt</div>
            ) : filteredCategories.map(cat => (
              <div key={cat.id} className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">{cat.name}</h3>
                {cat.templates.map((t: any) => (
                  <button 
                    key={t.id}
                    onClick={() => { setSelectedTemplate(t); setIsAdding(false); }}
                    className={`w-full text-left p-4 rounded-2xl transition-all border ${
                      selectedTemplate?.id === t.id 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                        : 'bg-white border-slate-100 hover:border-blue-300'
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
            ))}
          </div>
        </div>

        {/* RIGHT PANEL: CONTENT / FORM */}
        <div className="w-2/3 overflow-y-auto rounded-3xl no-scrollbar">
          {isAdding ? (
            <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6 animate-in slide-in-from-right-4 duration-300 h-full">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2"><Plus className="text-blue-600" /> Luo uusi malli</h2>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>
              <div className="space-y-4">
                <input 
                  placeholder="Otsikko"
                  className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTemplate.title}
                  onChange={e => setNewTemplate({...newTemplate, title: e.target.value})}
                />
                <input 
                  placeholder="Kategoria"
                  className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTemplate.categoryName}
                  onChange={e => setNewTemplate({...newTemplate, categoryName: e.target.value})}
                />
                <textarea 
                  placeholder="Sisältö..."
                  rows={15}
                  className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  value={newTemplate.content}
                  onChange={e => setNewTemplate({...newTemplate, content: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={handleSave} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">TALLENNA</button>
                <button onClick={() => setIsAdding(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200">PERUUTA</button>
              </div>
            </div>
          ) : selectedTemplate ? (
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden h-full flex flex-col">
              <div className="p-8 border-b bg-slate-50/50 flex justify-between items-start flex-shrink-0">
                <div>
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider mb-2 inline-block">
                    {categories.find(c => c.id === selectedTemplate.categoryId)?.name}
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedTemplate.title}</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleShare(selectedTemplate.id, selectedTemplate.title)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Jaa kollegalle">
                    <Share2 size={20} />
                  </button>
                  <button onClick={() => handleDelete(selectedTemplate.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="p-8 flex-1 overflow-y-auto">
                <div className="bg-slate-900 rounded-2xl p-6 text-emerald-400 font-mono text-sm leading-relaxed relative group shadow-inner">
                  <pre className="whitespace-pre-wrap">{selectedTemplate.content}</pre>
                  <button 
                    onClick={() => handleCopy(selectedTemplate.content)}
                    className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white backdrop-blur-sm"
                  >
                    {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                </div>
                <div className="flex items-center gap-6 text-slate-400 text-xs font-medium mt-6 pt-6 border-t">
                  <div className="flex items-center gap-2"><Clock size={14}/> <span>{new Date(selectedTemplate.createdAt).toLocaleDateString('fi-FI')}</span></div>
                  <div className="flex items-center gap-2"><User size={14}/> <span>{selectedTemplate.author || 'Oma malli'}</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl bg-white/50">
              <div className="bg-white p-6 rounded-full mb-4 shadow-sm"><FileText size={48} className="text-slate-200" /></div>
              <p className="font-medium">Valitse malli listasta tai luo uusi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
