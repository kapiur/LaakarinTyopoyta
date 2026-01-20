"use client";

import { useState, useEffect } from 'react';
import { 
  Search, Pill, ChevronRight, Loader2, MessageSquare, 
  Edit3, Save, HeartPulse, AlertTriangle, CheckCircle2, XCircle, Database 
} from 'lucide-react';

export default function MedicinesPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');

  // Функция для перехода к списку всех препаратов с этим веществом
  const handleSubstanceClick = (substanceName: string) => {
    setQuery(substanceName);
    setSelectedMed(null);
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);
        try {
          const res = await fetch(`/api/medicines?name=${encodeURIComponent(query)}&substance=${encodeURIComponent(query)}`);
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* ЛЕВАЯ ПАНЕЛЬ: ПОИСК */}
      <aside className="w-[400px] bg-white border-r flex flex-col shadow-sm z-20">
        <div className="p-6 border-b space-y-4">
          <div className="flex items-center gap-2 text-blue-600 font-black uppercase tracking-tighter">
            <Database size={20} />
            <h1>Lääketietokanta</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              placeholder="Hae nimellä tai aineella..." 
              className="w-full pl-11 pr-4 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={16} />}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {results.map((med) => (
            <button 
              key={med.id} 
              onClick={() => {
                setSelectedMed(med);
                setTempNotes(med.substance?.communityNotes || '');
                setIsEditingNotes(false);
              }}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                selectedMed?.id === med.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-50 hover:border-blue-200'
              }`}
            >
              <div className="flex-1">
                <div className="font-black text-sm uppercase tracking-tight leading-tight">{med.name}</div>
                <div className={`text-[10px] font-bold uppercase mt-1 tracking-widest opacity-70`}>
                  {med.substanceId}
                </div>
              </div>
              <ChevronRight size={18} className={selectedMed?.id === med.id ? 'text-white' : 'text-slate-300'} />
            </button>
          ))}
        </div>
      </aside>

      {/* ПРАВАЯ ПАНЕЛЬ: ДЕТАЛИ */}
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8 custom-scrollbar">
        {selectedMed ? (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-10 rounded-[32px] shadow-sm border border-slate-200/60">
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-3">{selectedMed.name}</h2>
              {/* Кнопка для поиска всех аналогов по веществу */}
              <button 
                onClick={() => handleSubstanceClick(selectedMed.substanceId)}
                className="text-xl text-blue-600 font-bold uppercase tracking-[0.1em] hover:underline transition-all"
              >
                {selectedMed.substanceId}
              </button>
            </div>

            {/* Wiki-заметки */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3 font-black text-slate-800 uppercase tracking-widest text-xs">
                  <MessageSquare className="text-amber-500" size={18} />
                  <h3>Yhteisön muistiinpanot</h3>
                </div>
                <button 
                  onClick={() => isEditingNotes ? setIsEditingNotes(false) : setIsEditingNotes(true)}
                  className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  {isEditingNotes ? <><Save size={14}/> Tallenna</> : <><Edit3 size={14}/> Muokkaa</>}
                </button>
              </div>
              <div className="p-8">
                {isEditingNotes ? (
                  <textarea 
                    className="w-full h-40 p-6 text-base bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-medium"
                    value={tempNotes}
                    onChange={(e) => setTempNotes(e.target.value)}
                  />
                ) : (
                  <p className="text-lg text-slate-600 leading-relaxed font-medium italic">
                    {selectedMed.substance?.communityNotes || "Ei vielä muistiinpanoja. Lisää kliiniset vinkit."}
                  </p>
                )}
              </div>
            </div>

            {/* Lääke75+ */}
            {selectedMed.substance?.laake75Comment && (
              <div className="bg-slate-900 rounded-[32px] p-8 text-white flex gap-6 items-center shadow-xl">
                <HeartPulse className="text-rose-400" size={32} />
                <p className="text-lg leading-relaxed text-slate-100 font-medium">{selectedMed.substance.laake75Comment}</p>
              </div>
            )}

            {/* Таблица упаковок */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Pakkausvaihtoehdot</h3>
                {selectedMed.prescriptionTerm && (
                  <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-1 rounded-xl border border-rose-100 text-[10px] font-black uppercase">
                    <AlertTriangle size={14} /> {selectedMed.prescriptionTerm}
                  </div>
                )}
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                  <tr>
                    <th className="px-8 py-4">VNR</th>
                    <th className="px-8 py-4">Pakkauskoko</th>
                    <th className="px-8 py-4 text-right">Saatavuus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedMed.packages?.map((pkg: any) => (
                    <tr key={pkg.vnr} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 font-bold text-blue-600 text-sm">{pkg.vnr}</td>
                      <td className="px-8 py-6 text-slate-700 font-bold text-sm">{pkg.sizeText}</td>
                      <td className="px-8 py-6 text-right">
                        {pkg.isAvailable ? (
                          <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            <CheckCircle2 size={12} className="inline mr-1" /> Varastossa
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[10px] font-black uppercase italic tracking-widest">
                            <XCircle size={12} className="inline mr-1" /> Loppu
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
            <Pill size={40} className="opacity-10" />
            <p className="font-black uppercase tracking-[0.4em] text-[10px]">Valitse lääke</p>
          </div>
        )}
      </main>
    </div>
  );
}
