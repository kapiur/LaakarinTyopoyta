"use client";
import { useState } from 'react';
import { Send, Bot, FileText, Calculator } from 'lucide-react';
import Link from 'next/link'; // Импортируем Link для навигации

export default function Dashboard() {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hei! Miten voin auttaa sinua tänään? Voin auttaa tekstien muotoilussa tai lääketieteellisissä kysymyksissä.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!chatInput.trim() || isLoading) return;

    const userMessage = { role: 'user', content: chatInput };
    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsLoading(true);

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
      console.error("Гребенная ошибка AI:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold text-slate-800">Tervetuloa, Tohtori</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* КЛИКАБЕЛЬНАЯ КАРТОЧКА MALLIT */}
          <Link href="/templates" className="block p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-blue-500 transition-all group">
            <h3 className="font-bold text-lg mb-2 text-blue-700 group-hover:text-blue-600 flex items-center gap-2">
              Mallit <FileText size={18} />
            </h3>
            <p className="text-sm text-slate-500">Käytä и muokkaa tallennettuja tutkimusmalleja.</p>
          </Link>

          {/* КАРТОЧКА LASKURIT (ПОКА ПРОСТО ДИВ) */}
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 opacity-60">
            <h3 className="font-bold text-lg mb-2 text-slate-700 flex items-center gap-2">
              Laskurit <Calculator size={18} />
            </h3>
            <p className="text-sm text-slate-500">BMI, GFR ja muut tulossa pian.</p>
          </div>
        </div>
      </div>

      {/* Окно чата */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2 bg-blue-50 rounded-t-xl">
          <Bot className="text-blue-600" size={20} />
          <span className="font-bold text-blue-900">AI-Avustaja</span>
        </div>
        
        <div className="flex-1 p-4 overflow-auto space-y-4 bg-slate-50/50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-xl text-sm shadow-sm ${
                m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && <div className="text-xs text-slate-400 animate-pulse italic text-center py-2">AI vastaa...</div>}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
          <div className="flex gap-2">
            <input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              type="text" 
              placeholder="Kysy tekoälyltä..." 
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button 
              onClick={sendMessage}
              disabled={isLoading}
              className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
