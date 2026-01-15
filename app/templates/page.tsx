"use client";
import { useState, useEffect } from 'react';
import { Clipboard, Plus, FileEdit, X, Save, Loader2, Trash2, Edit3 } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Состояние для формы (создание или редактирование)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tplForm, setTplForm] = useState({ title: '', category: 'Statukset', content: '' });

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    const res = await fetch('/api/templates');
    const data = await res.json();
    if (Array.isArray(data)) setTemplates(data);
  };

  const openEdit = (t: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(t.id);
    setTplForm({ title: t.title, category: t.category, content: t.content });
    setIsModalOpen(true);
  };

  const deleteTemplate = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Haluatko varmasti poistaa tämän mallin?")) return;
    const res = await fetch('/api/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) fetchTemplates();
  };

  const saveTemplate = async () => {
    setIsSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const body = editingId ? { ...tplForm, id: editingId } : tplForm;

    const res = await fetch('/api/templates', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      await fetchTemplates();
      setIsModalOpen(false);
      setEditingId(null);
      setTplForm({ title: '', category: 'Statukset', content: '' });
    }
    setIsSaving(false);
  };

  const selectedTemplate = templates.find(t => t.id === selectedId);

  const generateFinalText = () => {
    if (!selectedTemplate) return "";
    return selectedTemplate.content.replace(/{{(.*?)}}/g, (match: string, p1: string) => {
      const key = p1.split(':')[0].trim();
      return formValues[key] || "____";
    });
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-6 p-2">
      {/* Список шаблонов */}
      <div className="w-80 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Mallit</h2>
          <button onClick={() => { setEditingId(null); setTplForm({title:'', category:'Statukset', content:''}); setIsModalOpen(true); }} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto space-y-2">
          {templates.map(t => (
            <div key={t.id} onClick={() => { setSelectedId(t.id); setFormValues({}); }}
              className={`group p-4 rounded-xl border cursor-pointer transition-all relative ${selectedId === t.id ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
              <p className={`text-[10px] uppercase font-bold mb-1 ${selectedId === t.id ? 'text-blue-100' : 'text-blue-600'}`}>{t.category}</p>
              <p className="font-semibold text-sm pr-12">{t.title}</p>
              
              {/* Кнопки управления (появляются при наведении) */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => openEdit(t, e)} className="p-1.5 hover:bg-blue-500 rounded text-blue-400 group-hover:text-white"><Edit3 size={14} /></button>
                <button onClick={(e) => deleteTemplate(t.id, e)} className="p-1.5 hover:bg-red-500 rounded text-slate-300 hover:text-white"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Окно вывода (без изменений) */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex overflow-hidden">
        {selectedTemplate ? (
          <>
            <div className="w-1/2 p-8 border-r border-slate-100 overflow-auto">
              <h3 className="text-lg font-bold mb-6">{selectedTemplate.title}</h3>
              <div className="space-y-4">
                {selectedTemplate.content.match(/{{(.*?)}}/g)?.map((match: string) => {
                  const [key, type, options] = match.replace(/{{|}}/g, '').split(':');
                  return (
                    <div key={key}>
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{key}</label>
                      {type === 'select' ? (
                        <select className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm" onChange={e => setFormValues({...formValues, [key]: e.target.value})}>
                          <option value="">Valitse...</option>
                          {options.split(',').map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm" type="text" onChange={e => setFormValues({...formValues, [key]: e.target.value})} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="w-1/2 p-8 bg-slate-50 flex flex-col text-sm">
              <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-inner whitespace-pre-wrap font-serif leading-relaxed text-slate-700 italic">
                {generateFinalText()}
              </div>
              <button onClick={() => navigator.clipboard.writeText(generateFinalText())} className="mt-4 w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all">Kopioi teksti</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 italic"><FileEdit size={64} strokeWidth={1} /><p>Valitse malli vasemmalta</p></div>
        )}
      </div>

      {/* Модалка (общая для создания и редактирования) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-xl shadow-2xl">
            <h3 className="text-xl font-bold mb-6">{editingId ? 'Muokkaa mallia' : 'Uusi malli'}</h3>
            <div className="space-y-4">
              <input value={tplForm.title} placeholder="Otsikko" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setTplForm({...tplForm, title: e.target.value})} />
              <textarea value={tplForm.content} placeholder="Sisältö: {{muuttuja}}" className="w-full h-64 p-3 border rounded-xl font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setTplForm({...tplForm, content: e.target.value})} />
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Peruuta</button>
                <button onClick={saveTemplate} disabled={isSaving} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} Tallenna
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
