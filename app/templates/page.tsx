"use client";
import { useState, useEffect } from 'react';
import { Clipboard, Plus, FileEdit, X, Save, Loader2 } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newTpl, setNewTpl] = useState({ title: '', category: 'Statukset', content: '' });

  // Загрузка шаблонов
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
    } catch (e) {
      console.error("Ошибка загрузки:", e);
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedId);

  // Функция сохранения
  const saveTemplate = async () => {
    if (!newTpl.title || !newTpl.content) {
      alert("Täytä otsikko ja sisältö!");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTpl),
      });

      if (res.ok) {
        await fetchTemplates(); // Обновляем список
        setIsModalOpen(false);
        setNewTpl({ title: '', category: 'Statukset', content: '' });
      } else {
        const err = await res.json();
        alert("Virhe tallennuksessa: " + (err.error || "Unknown error"));
      }
    } catch (error) {
      alert("Palvelinvirhe!");
    } finally {
      setIsSaving(false);
    }
  };

const generateFinalText = () => {
  if (!selectedTemplate) return "";
  
  // Берем исходный текст шаблона
  let text = selectedTemplate.content;

  // Используем функцию замены с колбэком для точности
  return text.replace(/{{(.*?)}}/g, (match, p1) => {
    // p1 — это то, что внутри скобок, например "turvotus:select:ei,lievä"
    const [key] = p1.split(':'); 
    
    // Возвращаем значение из формы, если оно есть, иначе подчеркивание
    return formValues[key] || "____";
  });
};

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-6 p-2">
      <div className="w-80 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Mallit</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto space-y-2">
          {templates.length === 0 && <p className="text-sm text-slate-400 italic text-center p-4">Ei malleja vielä.</p>}
          {templates.map(t => (
            <div 
              key={t.id}
              onClick={() => { setSelectedId(t.id); setFormValues({}); }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedId === t.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <p className={`text-[10px] uppercase font-bold mb-1 ${selectedId === t.id ? 'text-blue-100' : 'text-blue-600'}`}>{t.category}</p>
              <p className="font-semibold text-sm">{t.title}</p>
            </div>
          ))}
        </div>
      </div>

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
                        <input className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm" type="text" placeholder={`Syötä ${key}`} onChange={e => setFormValues({...formValues, [key]: e.target.value})} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="w-1/2 p-8 bg-slate-50 flex flex-col">
              <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-inner whitespace-pre-wrap font-serif text-sm leading-relaxed text-slate-700">
                {generateFinalText()}
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(generateFinalText())}
                className="mt-4 w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-100"
              >
                Kopioi teksti
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <FileEdit size={64} strokeWidth={1} />
            <p>Valitse malli tai luo uusi klikkaamalla plussaa</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Uusi lääketieteellinen malli</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Otsikko</label>
                <input 
                  placeholder="esim. Polven status" 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  onChange={e => setNewTpl({...newTpl, title: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Kategoria</label>
                <select className="w-full p-3 border border-slate-200 rounded-xl" onChange={e => setNewTpl({...newTpl, category: e.target.value})}>
                  <option>Statukset</option>
                  <option>Lausunnot</option>
                  <option>Ohjeet</option>
                  <option>Muut</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Sisältö (käytä muuttujia {'{{...}}'})</label>
                <textarea 
                  placeholder="esim. Polvessa on {{turvotus:select:ei,lievä,runsas}} turvotusta." 
                  className="w-full h-40 p-3 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  onChange={e => setNewTpl({...newTpl, content: e.target.value})}
                />
              </div>
              <button 
                onClick={saveTemplate} 
                disabled={isSaving}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-slate-300 transition-all shadow-lg shadow-blue-100"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                {isSaving ? 'Tallennetaan...' : 'Tallenna kantaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
