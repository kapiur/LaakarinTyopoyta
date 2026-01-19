"use client";
import { useState } from 'react';
import { Send, Bot, FileText, Calculator, Scissors, Languages, ListChecks, Copy } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  // Состояния для чата (справа)
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hei! Miten voin auttaa sinua tänään? Voin auttaa tekstien muotoilussa tai lääketieteellisissä kysymyksissä.' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Состояния для Инструмента обработки текста (центр)
  const [toolText, setToolText] = useState('');
  const [toolResult, setToolResult] = useState('');
  const [toolMode, setToolMode] = useState('fix');
  const [isToolLoading, setIsToolLoading] = useState(false);

  // Функция анонимизации (HETU)
  const anonymize = (text: string) => {
    const hetuRegex = /\b\d{6}[-+ABCDEF]\d{3}[0-9A-Z]\b/gi;
    return text.replace(hetuRegex, '[HETU]');
  };

  // Логика чата
  const sendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMessage = { role: 'user', content: chatInput };
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
    } finally {
      setIsChatLoading(false);
    }
  };

  // Логика Инструментария (Кнопки)
  const processToolText = async (modeOverride?: string) => {
    const activeMode = modeOverride || toolMode;
    if (!toolText.trim() || isToolLoading) return;
    setIsToolLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: anonymize(toolText), 
          mode: activeMode 
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      
      {/* ЛЕВАЯ И ЦЕНТРАЛЬНАЯ ЧАСТЬ (Инструменты) */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold text-slate-800">Työpöytä</h2>
        
        {/* КАРТОЧКИ МОДУЛЕЙ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/templates" className="block p-4 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-blue-500 transition-all group">
            <h3 className="font-bold text-blue-700 group-hover:text-blue-600 flex items-center gap-2">
              Mallit <FileText size={18} />
            </h3>
            <p className="text-xs text-slate-500">Tutkimusmallit и интерактивные формы.</p>
          </Link>

          <Link href="/calculators" className="block p-4 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-blue-500 transition-all group">
            <h3 className="font-bold text-blue-700 group-hover:text-blue-600 flex items-center gap-2">
              Laskurit <Calculator size={18} />
            </h3>
            <p className="text-xs text-slate-500">PCA, BMI, eGFR ja annoslaskurit.</p>
          </Link>
        </div>

        {/* НОВЫЙ БЛОК: AI TEKSTITYÖKALU */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Bot size={20} className="text-blue-600" /> AI-Tekstityökalu
            </h3>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase tracking-tighter">GDPR Secured</span>
          </div>

          {/* Кнопки режимов */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
            {[
              { id: 'fix', label: 'Korjaa', icon: <ListChecks size={14} /> },
              { id: 'translate', label: 'Käännä', icon: <Languages size={14} /> },
              { id: 'summarize', label: 'Tiivistä', icon: <Scissors size={14} /> },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setToolMode(btn.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  toolMode === btn.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {btn.icon} {btn.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <textarea
              value={toolText}
              onChange={(e) => setToolText(e.target.value)}
              placeholder="Liitä käsiteltävä teksti tähän..."
              className="w-full h-32 p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/30"
            />
            
            <button
              onClick={() => processToolText()}
              disabled={isToolLoading || !toolText}
              className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-bold hover:bg-black disabled:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              {isToolLoading ? 'Käsitellään...' : 'SUORITA ANALYYSI'}
            </button>

            {toolResult && (
              <div className="mt-2 p-4 bg-blue-50/50 border border-blue-100 rounded-lg relative group">
                <button 
                  onClick={() => {navigator.clipboard.writeText(toolResult); alert("Kopioitu!");}}
                  className="absolute top-2 right-2 p-1.5 bg-white border border-blue-200 rounded-md text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Copy size={14} />
                </button>
                <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {toolResult}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ: ЧАТ АССИСТЕНТ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-blue-50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Bot className="text-blue-600" size={20} />
            <span className="font-bold text-blue-900 text-sm">AI-Avustaja</span>
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-auto space-y-4 bg-slate-50/50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-xl text-xs shadow-sm ${
                m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {isChatLoading && <div className="text-[10px] text-slate-400 animate-pulse italic text-center py-2 font-medium">Ladataan vastausta...</div>}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
          <div className="flex gap-2">
            <input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              type="text" 
              placeholder="Kysy neuvoa..." 
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
            <button 
              onClick={sendMessage}
              disabled={isChatLoading}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
}
