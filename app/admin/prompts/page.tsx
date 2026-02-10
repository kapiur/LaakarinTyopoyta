"use client";
import { useState, useEffect } from 'react';
import { 
  Wand2, Plus, Settings2, Loader2, Trash2, Edit2,
  Zap, Copy, X, Save, RotateCcw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AdminPromptsPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<any[]>([]);
  
  // Состояния для формы
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null); // хранит ID редактируемого промпта
  const [formData, setFormData] = useState({ label: '', content: '' });

  const fetchPrompts = async () => {
    const res = await fetch('/api/admin/prompts');
    const data = await res.json();
    setPrompts(data);
  };

  useEffect(() => { fetchPrompts(); }, []);

  // Очистка всего рабочего пространства
  const clearAll = () => {
    setText('');
    setResult('');
  };

  // Сохранение (Создание или Обновление)
  const handleSave = async () => {
    if (!formData.label || !formData.content) return;
    
    const method = isEditing ? 'PUT' : 'POST';
    const body = isEditing ? { id: isEditing, ...formData } : formData;

    await fetch('/api/admin/prompts', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setFormData({ label: '', content: '' });
    setIsEditing(null);
    setShowForm(false);
    fetchPrompts();
  };

  // Вход в режим редактирования
  const startEdit = (p: any) => {
    setFormData({ label: p.label, content: p.content });
    setIsEditing(p.id);
    setShowForm(true);
  };

  const deletePrompt = async (id: string) => {
    if (!confirm("Haluatko varmasti poistaa tämän työkalun?")) return;
    await fetch('/api/admin/prompts', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    fetchPrompts();
  };

  const runPrompt = async (pContent: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);

    const securePrompt = `HUOMIO: Muista anonymisoida kaikki potilastiedot vastauksessa. 
                          Käytä merkintöjä kuten [NIMI] tai [HETU]. 
                          Tehtävä: ${pContent}`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, customPrompt: securePrompt }),
      });
      const data = await response.json();
      setResult(data.content);
    } catch (error) {
      setResult("Virhe AI-yhteydessä.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
            <Settings2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Prompt Lab</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">GDPR & Database Secured</p>
          </div>
        </div>
        <button 
          onClick={() => { setShowForm(!showForm); setIsEditing(null); setFormData({label:'', content:''}); }}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          {showForm ? <X size={16}/> : <Plus size={16} />} 
          {showForm ? 'Sulje' : 'Uusi työkalu'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          {showForm && (
            <div className="bg-white border-2 border-blue-500/20 p-6 rounded-[2rem] space-y-4 shadow-xl animate-in zoom-in-95">
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">
                {isEditing ? 'Muokkaa työkalua' : 'Uusi työkalu'}
              </h3>
              <input 
                placeholder="Nimi (esim. Epikriisi-analyysi)..." 
                className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                value={formData.label}
                onChange={e => setFormData({...formData, label: e.target.value})}
              />
              <textarea 
                placeholder="AI-ohjeet (System Prompt)..." 
                className="w-full h-48 p-4 bg-slate-50 border-none rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                value={formData.content}
                onChange={e => setFormData({...formData, content: e.target.value})}
              />
              <button 
                onClick={handleSave} 
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
              >
                <Save size={16} /> {isEditing ? 'Tallenna muutokset' : 'Tallenna tietokantaan'}
              </button>
            </div>
          )}

          <div className="bg-white rounded-[2rem] border shadow-sm">
            <div className="p-6 border-b bg-slate-50/30 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Omat työkalut
            </div>
            <div className="p-4 space-y-2">
              {prompts.map((p) => (
                <div key={p.id} className="group relative bg-white border border-slate-100 rounded-2xl hover:border-blue-200 transition-all">
                  <div className="flex items-center pr-2">
                    <button
                      onClick={() => runPrompt(p.content)}
                      disabled={loading || !text}
                      className="flex-1 flex items-center gap-4 p-4 text-left"
                    >
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                        <Zap size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{p.label}</span>
                    </button>
                    
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEdit(p)}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Muokkaa"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deletePrompt(p.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title="Poista"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col min-h-[600px] relative">
            <div className="absolute top-4 right-4 z-20">
               <button 
                onClick={clearAll}
                className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 hover:text-red-500 hover:border-red-200 transition-all shadow-sm uppercase tracking-wider"
              >
                <RotateCcw size={14} /> Tyhjennä kaikki
              </button>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Liitä käsiteltävä teksti tähän..."
              className="w-full h-64 p-8 pt-16 outline-none text-slate-700 border-b font-medium resize-none text-sm"
            />
            <div className="flex-1 p-8 bg-slate-50/30 relative">
              {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                  <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">Käsitellään...</span>
                </div>
              )}
              <div className="prose prose-blue prose-sm max-w-none">
                {result ? (
                   <ReactMarkdown>{result}</ReactMarkdown>
                ) : (
                  <div className="text-slate-300 flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-[2rem]">
                    <Wand2 size={40} className="mb-2 opacity-20" />
                    <p className="text-xs uppercase tracking-widest font-bold">Valitse työkalu aloittaaksesi</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
