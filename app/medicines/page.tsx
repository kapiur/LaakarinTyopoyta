"use client";

import { useState, useEffect } from 'react';
import { Search, Database, ChevronRight, Loader2, MessageSquare, Edit3, Save, HeartPulse, CheckCircle2, XCircle } from 'lucide-react';

export default function MedicinesPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);
        try {
          const res = await fetch(`/api/medicines?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          setResults(data);
        } finally {
          setLoading(false);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* ПАНЕЛЬ ПОИСКА */}
      <aside className="w-[400px] bg-white border-r flex flex-col shadow-xl z-20">
        <div className="p-6 border-b space-y-4">
          <div className="flex items-center gap-2 text-blue-600 font-black uppercase tracking-tighter">
            <Database size={20} />
            <h1>Lääketietokanta</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              placeholder="Hae nimellä tai aineella..." 
              className="w-full pl-11 pr-4 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {results.map((med) => (
            <button 
              key={med.id} 
              onClick={() => setSelectedMed(med)}
              className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${
                selectedMed?.name === med.name ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-50 hover:border-blue-200'
              }`}
            >
              <div>
                <div className="font-black text-sm uppercase">{med.name}</div>
                <div className="text-[10px] font-bold uppercase opacity-60 mt-1 tracking-widest">{med.substanceId}</div>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </aside>

      {/* КАРТОЧКА ПРЕПАРАТА */}
      <main className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
        {selectedMed ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-200/60">
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">{selectedMed.name}</h2>
              {/* НАЗВАНИЕ ВЕЩЕСТВА — ТЕПЕРЬ ОТОБРАЖАЕТСЯ И КЛИКАЕТСЯ */}
              <button 
                onClick={() => setQuery(selectedMed.substanceId)}
                className="text-xl text-blue-600 font-bold uppercase tracking-[0.2em] hover:underline transition-all"
              >
                {selectedMed.substanceId || "Vaikuttava aine puuttuu"}
              </button>
            </div>

            {/* МУСТИИНПАНОТ */}
            <div className="bg-white rounded-[40px] shadow-sm border p-8">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="text-amber-500" />
                <h3 className="font-black uppercase text-xs tracking-widest text-slate-800">Yhteisön muistiinpanot</h3>
              </div>
              <p className="text-lg italic text-slate-600">
                {selectedMed.substance?.communityNotes || "Ei vielä merkintöjä tästä aineesta."}
              </p>
            </div>

            {/* ТАБЛИЦА УПАКОВОК */}
            <div className="bg-white rounded-[40px] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                  <tr>
                    <th className="px-8 py-4">VNR</th>
                    <th className="px-8 py-4">Pakkauskoko / Muoto</th>
                    <th className="px-8 py-4 text-right">Saatavuus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedMed.packages?.map((pkg: any) => (
                    <tr key={pkg.vnr} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 font-bold text-blue-600">{pkg.vnr}</td>
                      <td className="px-8 py-6 font-bold text-slate-700">{pkg.sizeText || 'Vakiopakkaus'}</td>
                      <td className="px-8 py-6 text-right font-black text-[10px] uppercase">
                        {pkg.isAvailable ? (
                          <span className="text-emerald-500 flex items-center justify-end gap-1"><CheckCircle2 size={12}/> Varastossa</span>
                        ) : (
                          <span className="text-slate-300 flex items-center justify-end gap-1"><XCircle size={12}/> Loppu</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <p className="font-black uppercase tracking-[0.4em] text-xs">Hae ja valitse lääke</p>
          </div>
        )}
      </main>
    </div>
  );
}
