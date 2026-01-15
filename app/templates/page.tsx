"use client";
import { useState, useEffect } from 'react';
import { Plus, X, Save, Loader2, Trash2, Edit3, Settings, Folder, Clipboard, FileEdit } from 'lucide-react';

export default function TemplatesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [selectedTplId, setSelectedTplId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  
  const [isTplModalOpen, setIsTplModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  
  const [tplForm, setTplForm] = useState({ title: '', content: '', categoryId: '' });
  const [editingTplId, setEditingTplId] = useState<number | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [cRes, tRes] = await Promise.all([fetch('/api/categories'), fetch('/api/templates')]);
      const cats = await cRes.json();
      const tpls = await tRes.json();
      if (Array.isArray(cats)) setCategories(cats);
      if (Array.isArray(tpls)) setTemplates(tpls);
      if (cats.length > 0 && !selectedCatId) setSelectedCatId(cats[0].id);
    } catch (e) { console.error("Load error", e); }
  }

  const saveCategory = async () => {
    if (!newCatName) return;
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName }),
    });
    setNewCatName('');
    loadData();
  };

  const deleteCategory = async (id: number) => {
    if (confirm("Haluatko poistaa osion ja sen mallit?")) {
      await fetch('/api/categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      loadData();
    }
  };

  const saveTemplate = async () => {
    if (!tplForm.title || !tplForm.categoryId || !tplForm.content) {
      alert("Täytä kaikki tiedot: otsikko, kategoria ja sisältö!");
      return;
    }
    setIsSaving(true);
    const method = editingTplId ? 'PUT' : 'POST';
    const body = editingTplId ? { ...tplForm, id: editingTplId } : tplForm;

    try {
      const res = await fetch('/api/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        setIsTplModalOpen(false);
        setEditingTplId(null);
        setTplForm({ title: '', content: '', categoryId: '' });
        await loadData();
      } else {
        const err = await res.json();
        alert("Virhe tallennuksessa: " + (err.error || "Palvelinvirhe"));
      }
    } catch (e) {
      alert("Yhteysvirhe palvelimeen");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTemplates = templates.filter(t => t.categoryId === selectedCatId);
  const selectedTemplate = templates.find(t => t.id === selectedTplId);

  const generateFinalText = () => {
    if (!selectedTemplate) return "";
    return selectedTemplate.content.replace(/{{(.*?)}}/g, (match: string, p1: string) => {
      const key = p1.split(':')[0].trim();
      return formValues[key] || "____";
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 p-4 bg-slate-50 text-slate-900">
      <div className="w-80 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center mb-4 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
            <span className="flex items-center gap-2"><Folder size={14}/> Osiot</span>
            <button onClick={() => setIsCatModalOpen(true)} className="hover:text-blue-600"><Settings size={16}/></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button key={c.id} onClick={() => { setSelectedCatId(c.id); setSelectedTplId(null); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedCatId === c.id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-white p-4 rounded-2xl border shadow-sm flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-4 border-b pb-2 font-bold text-sm">
            <span>Mallit</span>
            <button onClick={() => { 
              if(categories.length === 0) return alert("Luo ensin osio!"); 
              setTplForm({title:'', content:'', categoryId: String(selectedCatId || categories[0].id)}); 
              setEditingTplId(null); 
              setIsTplModalOpen(true); 
            }}
              className="p-1 bg-blue-600 text-white rounded-md"><Plus size={16}/></button>
          </div>
          <div className="flex-1 overflow-auto space-y-2">
            {filteredTemplates.map(t => (
              <div key={t.id} onClick={() => { setSelectedTplId(t.id); setFormValues({}); }}
                className={`group p-3 rounded-xl border cursor-pointer relative transition-all ${selectedTplId === t.id ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-100'}`}>
                <p className="font-medium text-sm pr-10 leading-tight">{t.title}</p>
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex gap-1">
                   <button onClick={(e) => { e.stopPropagation(); setEditingTplId(t.id); setTplForm({title:t.title, content:t.content, categoryId: String(t.categoryId)}); setIsTplModalOpen(true); }} className="p-1 hover:text-blue-600"><Edit3 size={14}/></button>
                   <button onClick={(e) => { e.stopPropagation(); if(confirm("Poista?")) fetch('/api/templates', {method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:t.id})}).then(loadData); }} className="p-1 hover:text-red-600"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl border shadow-sm flex overflow-hidden">
        {selectedTemplate ? (
          <div className="flex w-full h-full">
            <div className="w-1/2 p-8 border-r overflow-auto">
              <h2 className="text-xl font-bold mb-6 border-b pb-4">{selectedTemplate.title}</h2>
              <div className="space-y-4">
                {selectedTemplate.content.match(/{{(.*?)}}/g)?.map((match: string) => {
                  const [key, type, options] = match.replace(/{{|}}/g, '').split(':');
                  return (
                    <div key={key} className="bg-slate-50 p-3 rounded-xl">
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{key}</label>
                      {type === 'select' ? (
                        <select className="w-full p-2 border rounded-lg text-sm" onChange={e => setFormValues({...formValues, [key]: e.target.value})}>
                          <option value="">Valitse...</option>
                          {options.split(',').map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input className="w-full p-2 border rounded-lg text-sm" type="text" onChange={e => setFormValues({...formValues, [key]: e.target.value})} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="w-1/2 p-8 bg-slate-50 flex flex-col">
              <div className="flex-1 bg-white p-8 rounded-2xl border shadow-inner text-base leading-relaxed whitespace-pre-wrap font-serif italic text-slate-600">
                {generateFinalText()}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(generateFinalText()); alert("Kopioitu!"); }}
                className="mt-4 w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                <Clipboard size={20}/> Kopioi teksti
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 italic"><FileEdit size={64} className="mb-4 opacity-20"/><p>Valitse malli</p></div>
        )}
      </div>

      {/* МОДАЛКА ШАБЛОНА С ВЫБОРОМ КАТЕГОРИИ */}
      {isTplModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
            <h3 className="text-xl font-bold mb-6">{editingTplId ? 'Muokkaa mallia' : 'Uusi malli'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Otsikko</label>
                <input value={tplForm.title} placeholder="Esim. Polvi" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 mt-1" onChange={e => setTplForm({...tplForm, title: e.target.value})} />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Osio (Kategoria)</label>
                <select 
                  value={tplForm.categoryId} 
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                  onChange={e => setTplForm({...tplForm, categoryId: e.target.value})}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Sisältö</label>
                <textarea value={tplForm.content} placeholder="Käytä {{muuttuja}} или {{valinta:select:a,b}}" className="w-full h-64 p-4 border rounded-xl font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500 mt-1" onChange={e => setTplForm({...tplForm, content: e.target.value})} />
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsTplModalOpen(false)} className="flex-1 py-3 font-bold bg-slate-100 rounded-xl hover:bg-slate-200">Peruuta</button>
                <button onClick={saveTemplate} disabled={isSaving} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700">
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} Tallenna
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА КАТЕГОРИЙ */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between mb-6 items-center font-bold text-lg">
              <span>Hallitse osioita</span>
              <button onClick={() => setIsCatModalOpen(false)}><X/></button>
            </div>
            <div className="space-y-2 mb-6 max-h-60 overflow-auto pr-2">
              {categories.map(c => (
                <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-sm font-bold text-slate-700">{c.name}</span>
                  <button onClick={() => deleteCategory(c.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
              <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Uusi osio..." className="flex-1 bg-transparent p-2 outline-none text-sm px-4" />
              <button onClick={saveCategory} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">Lisää</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
