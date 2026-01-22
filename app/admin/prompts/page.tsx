"use client";
import { useState, useEffect } from 'react';
import { 
  Wand2, Plus, Settings2, Loader2, Trash2, 
  Stethoscope, Zap, Copy, ClipboardList 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AdminPromptsPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [showNewPromptForm, setShowNewPromptForm] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ label: '', content: '' });

  // Загрузка кнопок из БД
  const fetchPrompts = async () => {
    const res = await fetch('/api/admin/prompts');
    const data = await res.json();
    setPrompts(data);
  };

  useEffect(() => { fetchPrompts(); }, []);

  // Сохранение новой кнопки в БД
  const addPrompt = async () => {
    if (!newPrompt.label || !newPrompt.content) return;
    await fetch('/api/admin/prompts', {
      method: 'POST',
      body: JSON.stringify(newPrompt),
    });
    setNewPrompt({ label: '', content: '' });
    setShowNewPromptForm(false);
    fetchPrompts();
  };

  // Удаление кнопки
  const deletePrompt = async (id: string) => {
    await fetch('/api/admin/prompts', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    fetchPrompts();
  };

  const runPrompt = async (pContent: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, customPrompt: pContent }),
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
    <div className="max-w-[1400px] mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <header className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
            <Settings2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Prompt Lab</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Database Sync Active</p>
          </div>
        </div>
        <button 
          onClick={() => setShowNewPromptForm(!showNewPromptForm)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
        >
          <Plus size={16} /> Lisää uusi työkalu
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* КНОПКИ (ЛЕВАЯ ПАНЕЛЬ) */}
        <div className="lg:col-span-4 space-y-6">
          {showNewPromptForm && (
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] space-y-4 animate-in slide-in-from-top-4">
              <input 
                placeholder="Napin nimi..." 
                className="w-full p-3 bg-white border rounded-xl text-sm font-bold outline-none"
                value={newPrompt.label}
                onChange={e => setNewPrompt({...newPrompt, label: e.target.value})}
              />
              <textarea 
                placeholder="System Prompt (Ohjeet)..." 
                className="w-full h-32 p-3 bg-white border rounded-xl text-xs outline-none"
                value={newPrompt.content}
                onChange={e => setNewPrompt({...newPrompt, content: e.target.value})}
              />
              <button onClick={addPrompt} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest">Tallenna tietokantaan</button>
            </div>
          )}

          <div className="bg-white rounded-[2rem] border shadow-sm">
            <div className="p-6 border-b bg-slate-50/50 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Tallennetut työkalut</span>
            </div>
            <div className="p-4 space-y-2">
              {prompts.map((p) => (
                <div key={p.id} className="group relative flex items-center gap-2">
                  <button
                    onClick={() => runPrompt(p.content)}
                    disabled={loading || !text}
                    className="flex-1 flex items-center gap-4 p-4 rounded-2xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all text-left"
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:bg-white shadow-sm transition-all">
                      <Zap size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{p.label}</span>
                  </button>
                  <button 
                    onClick={() => deletePrompt(p.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* РАБОЧАЯ ОБЛАСТЬ (ЦЕНТР) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Liitä käsiteltävä teksti tähän..."
              className="w-full h-64 p-8 outline-none text-slate-700 border-b font-medium resize-none"
            />
            <div className="flex-1 p-8 bg-blue-50/10 relative">
              {loading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              )}
              <div className="prose prose-sm max-w-none">
                {result ? <ReactMarkdown>{result}</ReactMarkdown> : <span className="text-slate-400 italic">Tulos ilmestyy tähän...</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
