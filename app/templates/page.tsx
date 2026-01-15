"use client";
import { useState, useEffect } from 'react';
import { Plus, X, Save, Loader2, Trash2, Edit3, Settings, Folder } from 'lucide-react';

export default function TemplatesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [selectedTplId, setSelectedTplId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  
  // Modals
  const [isTplModalOpen, setIsTplModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  
  // Forms
  const [tplForm, setTplForm] = useState({ title: '', content: '', categoryId: '' });
  const [editingTplId, setEditingTplId] = useState<number | null>(null);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => { 
    loadData(); 
  }, []);

  async function loadData() {
    const [cRes, tRes] = await Promise.all([fetch('/api/categories'), fetch('/api/templates')]);
    const cats = await cRes.json();
    const tpls = await tRes.json();
    setCategories(cats);
    setTemplates(tpls);
    if (cats.length > 0 && !selectedCatId) setSelectedCatId(cats[0].id);
  }

  const saveCategory = async () => {
    if (!newCatName) return;
    await fetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: newCatName }),
    });
    setNewCatName('');
    loadData();
  };

  const deleteCategory = async (id: number) => {
    if (confirm("Удалить раздел и ВСЕ его шаблоны?")) {
      await fetch('/api/categories', { method: 'DELETE', body: JSON.stringify({ id }) });
      loadData();
    }
  };

  const saveTemplate = async () => {
    const method = editingTplId ? 'PUT' : 'POST';
    const body = editingTplId ? { ...tplForm, id: editingTplId } : tplForm;
    await fetch('/api/templates', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setIsTplModalOpen(false);
    setEditingTplId(null);
    loadData();
  };

  const filteredTemplates = templates.filter(t => t.categoryId === selectedCatId);
  const selectedTemplate = templates.find(t => t.id === selectedTplId);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 p-4 bg-slate-50">
      {/* Слева: Категории и Шаблоны */}
      <div className="w-80 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold flex items-center gap-2"><Folder size={18}/> Разделы</h3>
            <button onClick={() => setIsCatModalOpen(true)} className="text-slate-400 hover:text-blue-600"><Settings size={18}/></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button 
                key={c.id} 
                onClick={() => setSelectedCatId(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCatId === c.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-white p-4 rounded-2xl border shadow-sm flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm">Шаблоны раздела</h3>
            <button onClick={() => { setTplForm({title:'', content:'', categoryId: String(selectedCatId)}); setEditingTplId(null); setIsTplModalOpen(true); }} className="p-1.5 bg-blue-600 text-white rounded-lg"><Plus size={16}/></button>
          </div>
          <div className="flex-1 overflow-auto space-y-2">
            {filteredTemplates.map(t => (
              <div key={t.id} onClick={() => { setSelectedTplId(t.id); setFormValues({}); }} className={`group p-3 rounded-xl border cursor-pointer relative ${selectedTplId === t.id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                <p className="font-medium text-sm pr-8">{t.title}</p>
                <div className="absolute right-2 top-2 hidden group-hover:flex gap-1">
                   <button onClick={() => {/* edit logic */}} className="p-1 text-slate-400 hover:text-blue-600"><Edit3 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Справа: Работа с выбранным шаблоном */}
      <div className="flex-1 bg-white rounded-3xl border shadow-sm flex overflow-hidden">
        {selectedTemplate ? (
            <div className="flex w-full">
                <div className="w-1/2 p-8 border-r overflow-auto">
                    <h2 className="text-xl font-bold mb-6">{selectedTemplate.title}</h2>
                    {/* Поля ввода (аналогично предыдущему коду) */}
                </div>
                <div className="w-1/2 p-8 bg-slate-50 flex flex-col">
                    <div className="flex-1 bg-white p-6 rounded-2xl border shadow-inner italic text-slate-700">
                        {/* Результат */}
                    </div>
                </div>
            </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300 italic">Выберите шаблон для начала работы</div>
        )}
      </div>

      {/* Модалка категорий */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white p-8 rounded-3xl w-96 shadow-xl">
            <div className="flex justify-between mb-6 items-center">
              <h3 className="font-bold text-lg">Управление разделами</h3>
              <button onClick={() => setIsCatModalOpen(false)}><X/></button>
            </div>
            <div className="space-y-3 max-h-60 overflow-auto mb-6">
              {categories.map(c => (
                <div key={c.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">{c.name}</span>
                  <button onClick={() => deleteCategory(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Новый раздел" className="flex-1 p-2 border rounded-xl text-sm" />
              <button onClick={saveCategory} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">Ок</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
