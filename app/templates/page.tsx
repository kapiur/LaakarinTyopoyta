"use client";
import { useState, useEffect } from 'react';
import { Clipboard, Plus, FileEdit, X, Save } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Поля для нового шаблона
  const [newTpl, setNewTpl] = useState({ title: '', category: 'Statukset', content: '' });

  // Загрузка шаблонов из базы при старте
  useEffect(() => {
    fetch('/api/templates').then(res => res.json()).then(data => setTemplates(data));
  }, []);

  const selectedTemplate = templates.find(t => t.id === selectedId);

  const saveTemplate = async () => {
    const res = await fetch('/api/api/templates', {
      method: 'POST',
      body: JSON.stringify(newTpl),
    });
    if (res.ok) {
      const saved = await res.json();
      setTemplates([saved, ...templates]);
      setIsModalOpen(false);
      setNewTpl({ title: '', category: 'Statukset', content: '' });
    }
  };

  const generateFinalText = () => {
    if (!selectedTemplate) return "";
    let text = selectedTemplate.content;
    const matches = text.match(/{{(.*?)}}/g) || [];
    matches.forEach(match => {
      const [key] = match.replace(/{{|}}/g, '').split(':');
      text = text.replace(match, formValues[key] || '____');
    });
    return text;
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-6 p-2">
      {/* Список слева */}
      <div className="w-80 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Mallit</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto space-y-2">
          {templates.map(t => (
            <div 
              key={t.id}
              onClick={() => { setSelectedId(t.id); setFormValues({}); }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedId === t.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 hover:border-blue-300 text-slate-700'
              }`}
            >
              <p className={`text-[10px] uppercase font-bold ${selectedId === t.id ? 'text-blue-100' : 'text-blue-600'}`}>{t.category}</p>
              <p className="font-semibold text-sm">{t.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Работа с шаблоном */}
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
                        <select className="w-full p-2 bg-slate-50 border rounded-lg text-sm" onChange={e => setFormValues({...formValues, [key]: e.target.value})}>
                          <option value="">Valitse...</option>
                          {options.split(',').map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input className="w-full p-2 bg-slate-50 border rounded-lg text-sm" type="text" onChange={e => setFormValues({...formValues, [key]: e.target.value})} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="w-1/2 p-8 bg-slate-50 flex flex-col">
              <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-inner whitespace-pre-wrap font-serif text-sm">
                {generateFinalText()}
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(generateFinalText())}
                className="mt-4 w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all active:scale-95"
              >
                Kopioi teksti
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <FileEdit size={64} strokeWidth={1} />
            <p>Valitse tai luo uusi malli</p>
          </div>
        )}
      </div>

      {/* Модальное окно создания */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-[500px] shadow-2xl">
            <div className="flex justify-between mb-6">
              <h3 className="text-xl font-bold">Uusi malli</h3>
              <button onClick={() => setIsModalOpen(false)}><X /></button>
            </div>
            <div className="space-y-4">
              <input placeholder="Otsikko (esim. Polven status)" className="w-full p-3 border rounded-xl" onChange={e => setNewTpl({...newTpl, title: e.target.value})} />
              <select className="w-full p-3 border rounded-xl" onChange={e => setNewTpl({...newTpl, category: e.target.value})}>
                <option>Statukset</option>
                <option>Lausunnot</option>
                <option>Ohjeet</option>
              </select>
              <textarea 
                placeholder="Sisältö. Käytä {{muuttuja}} tai {{valinta:select:kyllä,ei}}" 
                className="w-full h-40 p-3 border rounded-xl font-mono text-sm"
                onChange={e => setNewTpl({...newTpl, content: e.target.value})}
              />
              <button onClick={saveTemplate} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                <Save size={20} /> Tallenna kantaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
