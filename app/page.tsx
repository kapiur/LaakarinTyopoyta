"use client";
import { useState } from 'react';
import { Send, Bot } from 'lucide-react';

export default function Dashboard() {
  const [chatInput, setChatInput] = useState('');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      {/* Vasen ja keskiosa: Mallit ja Laskurit */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold">Tervetuloa, Tohtori</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-bold text-lg mb-2">Viimeisimmät mallit</h3>
            <p className="text-sm text-slate-500 italic">Ei vielä tallennettuja malleja.</p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-bold text-lg mb-2">Suosikkilaskurit</h3>
            <p className="text-sm text-slate-500">BMI, GFR, Annoslaskuri...</p>
          </div>
        </div>
      </div>

      {/* Oikea laita: AI Chat */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2 bg-blue-50 rounded-t-xl">
          <Bot className="text-blue-600" size={20} />
          <span className="font-bold text-blue-900">AI-Avustaja (GPT-4o)</span>
        </div>
        
        <div className="flex-1 p-4 overflow-auto space-y-4">
          <div className="bg-slate-100 p-3 rounded-lg text-sm max-w-[85%]">
            Hei! Miten voin auttaa sinua tänään? Voin auttaa tekstien muotoilussa tai lääketieteellisissä kysymyksissä.
          </div>
        </div>

        <div className="p-4 border-t border-slate-200">
          <div className="relative">
            <input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              type="text" 
              placeholder="Kysy tekoälyltä..." 
              className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
