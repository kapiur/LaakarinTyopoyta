"use client";

import { useState, useEffect } from 'react';
import { 
  Search, Pill, Info, ChevronRight, Loader2, Edit3, Save, 
  CheckCircle2, XCircle, AlertTriangle, MessageSquare, HeartPulse
} from 'lucide-react';

export default function MedicinesPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');

  // Универсальный поиск (Бренд или Вещество)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 1) {
        setLoading(true);
        try {
          // Отправляем запрос, который API обработает как для name, так и для substance
          const res = await fetch(`/api/medicines?name=${query}&substance=${query}`);
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const saveNotes = async () => {
    if (!selectedMed?.substance) return;
    try {
      // Логика сохранения в БД
      setIsEditingNotes(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* LEFT: SEARCH RESULTS */}
      <aside className="w-[450px] bg-white border-r flex flex-col shadow-xl z-20">
        <div className="p-6 border-b space-y-4 bg-white">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Lääketietokanta</h1>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              autoFocus
              placeholder="Hae nimellä tai aineella..." 
              className="w-full pl-11 pr-4 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
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
              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                selectedMed?.id === med.id 
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                : 'bg-white border-slate-100 hover:border-blue-200'
              }`}
            >
              <div className="flex-1">
                <div className="font-bold text-base">{med.name}</div>
                <div className={`text-[11px] font-medium uppercase mt-1 ${selectedMed?.id === med.id ? 'text-blue-100' : 'text-slate-400'}`}>
                  {med.substanceId}
                </div>
              </div>
              <ChevronRight size={18} className={selectedMed?.id === med.id ? 'text-white' : 'text-slate-300'} />
            </button>
          ))}
        </div>
      </aside>

      {/* RIGHT: DETAILED DASHBOARD */}
      <main className="flex-1 overflow-y-auto bg-slate-100 p-8 custom-scrollbar">
        {selectedMed ? (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
            
            {/* Header Card */}
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-200/60 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter">{selectedMed.name}</h2>
                  {selectedMed.isPediatric && (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                      Lastenlääke
                    </span>
                  )}
                </div>
                <p className="text-xl text-blue-600 font-bold uppercase tracking-widest">{selectedMed.substanceId}</p>
              </div>
              {/* Lääke75+ Badge */}
              {selectedMed.substance?.laake75Class && (
                <div className="absolute top-10 right-10 flex flex-col items-center">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Lääke75+</div>
                  <div className={`text-3xl font-black w-16 h-16 flex items-center justify-center rounded-3xl text-white shadow-2xl ${
                    ['C', 'D'].includes(selectedMed.substance.laake75Class) ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}>
                    {selectedMed.substance.laake75Class}
                  </div>
                </div>
              )}
            </div>

            {/* EXPANDED WIKI NOTES */}
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                    <MessageSquare size={20} />
                  </div>
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Yhteisön muistiinpanot</h3>
                </div>
                <button 
                  onClick={() => isEditingNotes ? saveNotes() : setIsEditingNotes(true)}
                  className="px-6 py-2 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  {isEditingNotes ? <><Save size={14}/> Tallenna</> : <><Edit3 size={14}/> Muokkaa</>}
                </button>
              </div>
              <div className="p-8">
                {isEditingNotes ? (
                  <textarea 
                    className="w-full h-48 p-6 text-base bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-blue-500 transition-all"
                    value={tempNotes}
                    onChange={(e) => setTempNotes(e.target.value)}
                    placeholder="Kirjoita kliinisiä huomioita, annosteluohjeita tai varoituksia..."
                  />
                ) : (
                  <div className="prose prose-slate max-w-none">
                    <p className="text-lg text-slate-600 leading-relaxed font-medium italic">
                      {selectedMed.substance?.communityNotes || "Ei vielä muistiinpanoja. Lisää ensimmäinen kliininen huomio."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Lääke75+ Comment Block */}
            {selectedMed.substance?.laake75Comment && (
              <div className="bg-slate-900 rounded-[40px] p-8 text-white flex gap-6 items-start shadow-xl">
                <div className="p-4 bg-white/10 rounded-3xl">
                  <HeartPulse className="text-rose-400" size={32} />
                </div>
                <div>
                  <h4 className="font-black uppercase tracking-widest text-xs text-slate-400 mb-2">Fimea Lääke75+ Kommentti</h4>
                  <p className="text-lg leading-relaxed text-slate-200">{selectedMed.substance.laake75Comment}</p>
                </div>
              </div>
            )}

            {/* PACKAGE TABLE */}
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-8 border-b bg-slate-50/30 flex justify-between items-center">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Pakkausvaihtoehdot</h3>
                {selectedMed.prescriptionTerm && (
                  <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-2xl border border-rose-100">
                    <AlertTriangle size={16} />
                    <span className="text-[10px] font-black uppercase tracking-wider">{selectedMed.prescriptionTerm}</span>
                  </div>
                )}
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                    <th className="px-8 py-4">VNR</th>
                    <th className="px-8 py-4">Koko / Teksti</th>
                    <th className="px-8 py-4 text-right">Saatavuus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedMed.packages.map((pkg: any) => (
                    <tr key={pkg.vnr} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-8 py-6 font-mono text-sm font-bold text-blue-600">{pkg.vnr}</td>
                      <td className="px-8 py-6 text-slate-700 font-bold">{pkg.sizeText}</td>
                      <td className="px-8 py-6 text-right">
                        {pkg.isAvailable ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                            <CheckCircle2 size={12} /> Varastossa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[10px] font-black uppercase italic">
                            <XCircle size={12} /> Loppu
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
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-inner mb-6">
              <Pill size={48} className="opacity-10" />
            </div>
            <p className="font-black uppercase tracking-[0.3em] text-xs">Valitse lääke</p>
          </div>
        )}
      </main>
    </div>
  );
}
