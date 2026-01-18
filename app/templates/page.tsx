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
  
  // Главное состояние значений
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});

  useEffect(() => { fetchTemplates(); }, []);
  
  // Сброс значений при смене шаблона для чистоты логики
  useEffect(() => { 
    setTemplateValues({}); 
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
      if (data.length > 0 && !activeCategoryId) setActiveCategoryId(data[0].id);
    } catch (err) { console.error("Virhe:", err); } finally { setLoading(false); }
  };

  // 1. УЛУЧШЕННЫЙ ПАРСЕР (Изолирует ID, Тип и Условие)
  const parseTemplate = (content: string) => {
    const parts = [];
    const regex = /{{(.*?)}}/g;
    let lastIndex = 0, match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
      }

      const rawConfig = match[1];
      const config = rawConfig.split(':').map(part => part.trim()); // Очистка пробелов
      
      const id = config[0];
      const showIfCond = config.find(c => c.startsWith('showIf'));
      
      let condition = null;
      if (showIfCond) {
        const condMatch = showIfCond.match(/showIf:([\w-]+)=([\w,а-яА-Я-]+)/);
        if (condMatch) {
          condition = { parentId: condMatch[1], value: condMatch[2] };
        }
      }

      parts.push({ 
        id,
        type: config.includes('select') ? 'select' : 'input', 
        options: config.find(c => c.includes(','))?.split(',').map(o => o.trim()) || [],
        condition,
        raw: rawConfig 
      });

      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) parts.push({ type: 'text', value: content.slice(lastIndex) });
    return parts;
  };

  // 2. УМНЫЙ ГЕНЕРАТОР ТЕКСТА (Вырезает скрытые поля)
  const generateFinalText = useMemo(() => {
    if (!selectedTemplate) return "";
    
    const parsed = parseTemplate(selectedTemplate.content);
    let result = "";

    parsed.forEach(part => {
      if (part.type === 'text') {
        result += part.value;
      } else {
        let isVisible = true;
        if (part.condition) {
          isVisible = templateValues[part.condition.parentId] === part.condition.value;
        }
        
        if (isVisible) {
          const val = templateValues[part.id];
          // Если значение не выбрано, показываем ID в скобках, если выбрано — само значение
          result += val || `[${part.id}]`;
        }
      }
    });

    // Финальная чистка лишних пробелов и знаков препинания перед скрытыми блоками
    return result.replace(/[ ]{2,}/g, ' ').replace(/\s+\./g, '.').trim();
  }, [selectedTemplate, templateValues]);

  // Остальная логика (Save, Copy, Edit) остается прежней...
  const handleCopy = () => {
    navigator.clipboard.writeText(generateFinalText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const startEditing = (template: any) => {
    setFormData({
      id: template.id, title: template.title, content: template.content,
      categoryName: categories.find(c => c.id === template.categoryId)?.name || '', 
      author: template.author || ''
    });
    setIsEditing(true);
  };

  const [formData, setFormData] = useState({ id: null as any, title: '', content: '', categoryName: '', author: '' });
  const handleSave = async () => { /* Ваш существующий handleSave */ };

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-6 p-4">
      {/* Категории и Поиск... */}
      
      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Список шаблонов слева... */}

        <div className="col-span-9 overflow-hidden">
          {selectedTemplate && !(isAdding || isEditing) ? (
            <div className="grid grid-cols-2 h-full gap-6">
              {/* ПАНЕЛЬ ВЫБОРА */}
              <div className="bg-white rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Valinnat</span>
                  <button onClick={() => startEditing(selectedTemplate)}><Edit2 size={16}/></button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto no-scrollbar space-y-6">
                  {parseTemplate(selectedTemplate.content)
                    .filter(p => p.type !== 'text')
                    .map((part, idx) => {
                      
                      // ЛОГИКА СКРЫТИЯ В UI
                      if (part.condition) {
                        const parentVal = templateValues[part.condition.parentId];
                        if (parentVal !== part.condition.value) return null;
                      }

                      return (
                        <div key={idx} className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{part.id}</label>
                          {part.type === 'select' ? (
                            <div className="flex flex-wrap gap-2">
                              {part.options.map((opt: any) => (
                                <button 
                                  key={opt} 
                                  onClick={() => setTemplateValues(prev => ({ ...prev, [part.id]: opt }))} 
                                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${templateValues[part.id] === opt ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:border-blue-300'}`}
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

              {/* КОНСОЛЬ */}
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
            /* Отрисовка форм добавления/редактирования... */
          )}
        </div>
      </div>
    </div>
  );
}
