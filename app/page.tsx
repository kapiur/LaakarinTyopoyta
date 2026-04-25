"use client";
import { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, FileText, Calculator, Scissors, Languages, 
  ListChecks, Copy, MessageSquareShare, Zap, ShieldCheck, Loader2,
  RotateCcw, FlaskConical 
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

export default function Dashboard() {
  // Состояния для чата (справа)
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hei! Miten voin auttaa sinua tänään? Voin auttaa tekstien muotoilussa, diagnoosikriteerien tarkistamisessa tai lääketieteellisissä kysymyksissä.' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Состояния для Инструмента обработки текста (центр)
  const [toolText, setToolText] = useState('');
  const [toolResult, setToolResult] = useState('');
  const [toolMode, setToolMode] = useState('fix');
  const [isToolLoading, setIsToolLoading] = useState(false);

  // Авто-скролл чата при новых сообщениях
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Улучшенная анонимизация (HETU + Телефоны)
  const anonymize = (text: string) => {
    const hetuRegex = /\b\d{6}[-+ABCDEF]\d{3}[0-9A-Z]\b/gi;
    const phoneRegex = /\b(04\d|050)\s?\d{3}\s?\d{3,4}\b/g;
    return text
      .replace(hetuRegex, '[HETU]')
      .replace(phoneRegex, '[PUHELIN]');
  };

  // Очистка формы инструментария
  const clearTool = () => {
    setToolText('');
    setToolResult('');
  };

  // Логика чата
  const sendMessage = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || chatInput;
    if (!messageToSend.trim() || isChatLoading) return;

    const userMessage = { role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });
      const data = await response.json();
      if (data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      }
    } catch (error) {
      console.error("AI-virhe:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Virhe yhteydessä tekoälyyn.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Логика Инструментария
  const processToolText = async () => {
    if (!toolText.trim() || isToolLoading) return;
    setIsToolLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: anonymize(toolText),
          mode: toolMode
        }),
      });
      const data = await response.json();
      if (data.content) setToolResult(data.content);
    } catch (error) {
      setToolResult("Virhe tekstin käsittelyssä.");
    } finally {
      setIsToolLoading(false);
    }
  };

  const moveResultToChat = () => {
    if (!toolResult) return;
    const promptForChat = `Tässä on käsitelty teksti, haluaisin kysyä siitä lisää:\n\n${toolResult}`;
    sendMessage(promptForChat);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full animate-in fade-in duration-700">
      
      {/* ЛЕВАЯ И ЦЕНТРАЛЬНАЯ ЧАСТЬ */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Lääkärin Työpöytä</h2>
        
        {/* Навигация */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/templates" className="block p-5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all group">
            <h3 className="font-bold text-blue-700 group-hover:text-blue-600 flex items-center gap-2 mb-1">
              Mallit <FileText size={18} />
            </h3>
            <p className="text-[11px] leading-relaxed text-slate-500">Kliiniset tutkimusmallit ja strukturoidut tekstipohjat.</p>
          </Link>

          <Link href="/calculators" className="block p-5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all group">
            <h3 className="font-bold text-blue-700 group-hover:text-blue-600 flex items-center gap-2 mb-1">
              Laskurit <Calculator size={18} />
            </h3>
            <p className="text-[11px] leading-relaxed text-slate-500">Annoslaskurit, eGFR, BMI и другие инструменты.</p>
          </Link>

          <Link href="/pikaohjeet" className="block p-5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all group">
            <h3 className="font-bold text-white flex items-center gap-2 mb-1">
              Pikaohjeet <Zap size={18} className="text-amber-300" />
            </h3>
            <p className="text-[11px] leading-relaxed text-blue-100">Interaktiiviset ohjekortit ja diagnostiikka-apu.</p>
          </Link>
        </div>

        {/* AI TEKSTITYÖKALU */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Bot size={22} className="text-blue-600" /> AI-Tekstityökalu
              </h3>
              <button 
                onClick={clearTool}
                className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 uppercase"
                title="Tyhjennä lomake"
              >
                <RotateCcw size={14} /> Tyhjennä
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              <ShieldCheck size={12} /> GDPR SECURED
            </div>
          </div>

          <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-fit">
            {[
              { id: 'fix', label: 'Korjaa', icon: <ListChecks size={14} /> },
              { id: 'translate', label: 'Käännä', icon: <Languages size={14} /> },
              { id: 'summarize', label: 'Tiivistä', icon: <Scissors size={14} /> },
              { id: 'labrat', label: 'Labrat', icon: <FlaskConical size={14} /> },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setToolMode(btn.id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  toolMode === btn.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {btn.icon} {btn.label.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <textarea
              value={toolText}
              onChange={(e) => setToolText(e.target.value)}
              placeholder="Liitä potilasteksti tai tutkimustulokset tähän (HETU анонимизируется автоматически)..."
              className="w-full h-40 p-4 text-sm border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none bg-slate-50/30 transition-all resize-none font-medium"
            />
            
            <button
              onClick={() => processToolText()}
              disabled={isToolLoading || !toolText}
              className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black disabled:bg-slate-200 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest shadow-lg shadow-slate-200"
            >
              {isToolLoading ? <Loader2 size={18} className="animate-spin" /> : 'Suorita älykäs analyysi'}
            </button>

            {toolResult && (
              <div className="mt-4 p-6 bg-blue-50/50 border border-blue-100 rounded-2xl relative animate-in zoom-in-95 duration-300">
                <div className="flex justify-end gap-2 mb-4">
                  <button 
                    onClick={moveResultToChat}
                    className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white flex items-center gap-2 text-[10px] font-bold uppercase transition-all shadow-sm"
                  >
                    <MessageSquareShare size={14} /> Chattiin
                  </button>
                  <button 
                    onClick={() => {navigator.clipboard.writeText(toolResult); alert("Kopioitu!");}}
                    className="p-1.5 bg-white border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <div className="prose prose-sm max-w-none text-slate-800 font-medium leading-relaxed">
                   <ReactMarkdown>{toolResult}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ: ЧАТ АССИСТЕНТ */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-10rem)] overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <Bot size={18} />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-sm block">AI-Avustaja</span>
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter flex items-center gap-1">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> Online
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-5 overflow-auto space-y-4 bg-slate-50/30 custom-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[90%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
              }`}>
                <ReactMarkdown className="prose prose-sm max-w-none prose-p:leading-relaxed">
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {isChatLoading && (
             <div className="flex justify-start">
               <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex gap-2">
                 <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                 <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                 <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
               </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-5 bg-white border-t border-slate-100">
          <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 focus-within:border-blue-300 transition-all">
            <input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              type="text" 
              placeholder="Kysy diagnoosista tai hoidosta..." 
              className="flex-1 px-3 py-2 bg-transparent outline-none text-sm font-medium"
            />
            <button 
              onClick={() => sendMessage()}
              disabled={isChatLoading || !chatInput.trim()}
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-200 transition-all shadow-md active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}
