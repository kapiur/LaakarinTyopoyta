"use client";
import { useState } from 'react';
import { useSession } from "next-auth/react";
import { redirect } from 'next/navigation';
import { 
  Wand2, Save, Terminal, Copy, MessageSquare, 
  Trash2, Plus, Zap, Stethoscope, FileSearch, GraduationCap 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AdminPromptsPage() {
  const { data: session, status } = useSession();
  
  // 1. ЗАЩИТА: Замените на ваш email
  const ADMIN_EMAIL = "your-email@example.com"; 

  if (status === "unauthenticated" || (session?.user?.email !== ADMIN_EMAIL)) {
    // redirect('/'); // Раскомментируйте для жесткой защиты
  }

  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  // 2. ВАШИ ПЕРСОНАЛЬНЫЕ ПРОМПТЫ
  const customPrompts = [
    { 
      id: 'epicrisis', 
      label: 'Strukturoi Epikriisi', 
      icon: <Stethoscope size={16} />,
      prompt: "Strukturoi seuraava teksti selkeäksi epikriisiksi: Tulovaihe, Tutkimukset, Hoito ja kulku, Jatkosuunnitelma. Käytä lääketieteellistä kieltä." 
    },
    { 
      id: 'patient_edu', 
      label: 'Potilasohjeeksi', 
      icon: <GraduationCap size={16} />,
      prompt: "Muuta tämä lääketieteellinen teksti selkeäksi ja ymmärrettäväksi potilasohjeeksi. Vältä vaikeita termejä." 
    },
    { 
      id: 'differential', 
      label: 'Erotusdiagnostiikka', 
      icon: <FileSearch size={16} />,
      prompt: "Analysoi oireet ja löydökset. Listaa 3 todennäköisintä erotusdiagnostista vaihtoehtoa ja tarvittavat jatkotutkimukset." 
    },
    { 
      id: 'english_pro', 
      label: 'Проф. Английский', 
      icon: <Zap size={16} />,
      prompt: "Translate this medical text into professional English suitable for a scientific journal." 
    }
  ];

  const runPrompt = async (systemPrompt: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text, 
          customPrompt: systemPrompt // Мы передадим это как инструкцию
        }),
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
    <div className="max-w-6xl mx-auto space-y-6 p-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Terminal className="text-blue-600" /> Admin Prompt Lab
          </h1>
          <p className="text-sm text-slate-500">Työkalut tekstin syvään analyysiin ja muotoiluun.</p>
        </div>
        <div className="px-4 py-1.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-200 uppercase tracking-widest">
          Personal Access Only
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Area */}
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Liitä raaka teksti tähän..."
            className="w-full h-[400px] p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all resize-none font-mono text-sm"
          />
          
          <div className="grid grid-cols-2 gap-3">
            {customPrompts.map((p) => (
              <button
                key={p.id}
                onClick={() => runPrompt(p.prompt)}
                disabled={loading || !text}
                className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {p.icon}
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Output Area */}
        <div className="flex flex-col">
          <div className="flex-1 bg-slate-900 rounded-[2rem] p-8 text-slate-300 overflow-auto shadow-2xl relative min-h-[500px]">
            {loading && (
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center rounded-[2rem] z-10">
                <Loader2 className="animate-spin text-blue-500" size={32} />
              </div>
            )}
            
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI Result</span>
              {result && (
                <button 
                  onClick={() => {navigator.clipboard.writeText(result); alert("Kopioitu!");}}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                >
                  <Copy size={16} />
                </button>
              )}
            </div>

            <div className="prose prose-invert prose-sm max-w-none">
              {result ? (
                <ReactMarkdown>{result}</ReactMarkdown>
              ) : (
                <p className="text-slate-600 italic">Tulos ilmestyy tähän...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Loader2 = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);
