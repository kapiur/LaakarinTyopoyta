"use client";
import { useState, useEffect } from 'react';
import { Clipboard, Plus, ChevronRight, FileEdit, Trash2 } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([
    { id: 1, title: 'Polven status', category: 'Statukset', content: 'Polvi: {{turvotus:select:ei,lievä,selvä}}. Liike: {{liike:number}} astetta.' },
    { id: 2, title: 'DNR-päätös', category: 'Lausunnot', content: 'Potilaan kanssa keskusteltu {{pvm:date}}. DNR-päätös tehty perusteella: {{peruste}}.' }
  ]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const selectedTemplate = templates.find(t => t.id === selectedId);

  // Функция сборки итогового текста
  const generateFinalText = () => {
    if (!selectedTemplate) return "";
    let text = selectedTemplate.content;
    const matches = text.match(/{{(.*?)}}/g) || [];
    
    matches.forEach(match => {
      const parts = match.replace(/{{|}}/g, '').split(':');
      const key = parts[0];
      text = text.replace(match, formValues[key] || '____');
    });
    return text;
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-6">
      {/* Левая панель: Список */}
      <div className="w-80 flex flex-col gap-4">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-xl font-bold text-slate-800">Mallit</h2>
          <button className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto space-y-2 pr-2">
          {templates.map(t => (
            <div 
              key={t.id}
              onClick={() => { setSelectedId(t.id); setFormValues({}); }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedId === t.id ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 hover:border-blue-300 text-slate-700'
              }`}
            >
              <p className={`text-[10px] uppercase font-bold mb-1 ${selectedId === t.id ? 'text-blue-100' : 'text-blue-600'}`}>
                {t.category}
              </p>
              <p className="font-semibold text-sm">{t.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Правая панель: Работа с шаблоном */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {selectedTemplate ? (
          <div className="flex h-full">
            {/* Форма ввода */}
            <div className="w-1/2 p-8 border-r border-slate-100 overflow-auto">
              <h3 className="text-lg font-bold mb-6 text-slate-800">{selectedTemplate.title}</h3>
              <div className="space-y-5">
                {selectedTemplate.content.match(/{{(.*?)}}/g)?.map(match => {
                  const [key, type, options] = match.replace(/{{|}}/g, '').split(':');
                  return (
                    <div key={key} className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">{key}</label>
                      {type === 'select' ? (
                        <select 
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                          onChange={e => setFormValues({...formValues, [key]: e.target.value})}
                        >
                          <option value="">Valitse...</option>
                          {options.split(',').map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input 
                          type={type === 'date' ? 'date' : (type === 'number' ? 'number' : 'text')}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                          placeholder={`Kirjoita ${key}...`}
                          onChange={e => setFormValues({...formValues, [key]: e.target.value})}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Результат */}
            <div className="w-1/2 p-8 bg-slate-50/50 flex flex-col">
              <p className="text-xs font-bold text-slate-400 uppercase mb-4">Esikatselu</p>
              <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 text-slate-700 leading-relaxed text-sm shadow-inner whitespace-pre-wrap font-serif">
                {generateFinalText()}
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(generateFinalText())}
                className="mt-6 w-full py-4 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-transform active:scale-95 shadow-lg shadow-emerald-100"
              >
                <Clipboard size={20} /> Kopioi teksti
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
            <FileEdit size={48} strokeWidth={1} />
            <p>Valitse malli vasemmalta aloittaaksesi</p>
          </div>
        )}
      </div>
    </div>
  );
}
