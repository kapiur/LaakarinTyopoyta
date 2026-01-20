"use client";

import { useState, useEffect } from 'react';
import { 
  Search, Pill, AlertCircle, Info, Stethoscope, ChevronRight, 
  Loader2, FileText, ShieldCheck, Globe, Database, HeartPulse,
  Scale, Edit3, Save, CheckCircle2, XCircle
} from 'lucide-react';

export default function MedicinesPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');

  // Поиск с дебаунсом
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 1) {
        setLoading(true);
        try {
          // Поиск работает и по названию, и по веществу
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

  // Сохранение Wiki-заметок
  const saveNotes = async () => {
    if (!selectedMed?.substance) return;
    try {
      // Здесь будет PATCH запрос к API для обновления Substance.communityNotes
      console.log("Saving notes for", selectedMed.substanceId, tempNotes);
      setIsEditingNotes(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* HEADER / SEARCH BAR */}
      <header className="bg-white border-b p-4 flex items-center gap-6 shadow-sm z-10">
        <div className="flex items-center gap-2 px-4 border-r pr-6">
          <Database className="text-blue-600" size={24} />
          <h1 className="text-xl font-bold text-slate-900">Lääkärin Työpöytä</h1>
        </div>
        
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            autoFocus
            placeholder="Hae kauppanimellä tai vaikuttavalla aineella (esim. Panadol или parasetamoli)..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-100 border-transparent rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={18} />}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: SEARCH RESULTS */}
        <aside className="w-[400px] border-r bg-white overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
              Löydetty: {results.length} valmistetta
            </h3>
            
            {results.map((med) => (
              <div 
                key={med.id} 
                onClick={() => {
                  setSelectedMed(med);
                  setTempNotes(med.substance?.communityNotes || '');
                  setIsEditingNotes(false);
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all group ${
                  selectedMed?.id === med.id 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                  : 'bg-white border-slate-100 hover:border-blue-300 text-slate-900'
                }`}
              >
                <div className="font-bold text-lg leading-tight">{med.name}</div>
                <div className={`text-xs mt-1 font-medium ${selectedMed?.id === med.id ? 'text-blue-100' : 'text-slate-500'}`}>
                  {med.substanceId}
                </div>
                
                {/* Формы в виде тегов */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {Array.from(new Set(med.packages.map((p: any) => p.strength))).map((s: any) => (
                    <span key={s} className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase ${
                      selectedMed?.id === med.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* RIGHT PANEL: DETAILED CARD */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-8 custom-scrollbar">
          {selectedMed ? (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* TOP HEADER */}
              <div className="bg-white p-8 rounded-3xl border shadow-sm flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">{selectedMed.name}</h2>
                    {selectedMed.isPediatric && (
                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                        Lastenlääke
                      </span>
                    )}
                  </div>
                  <p className="text-xl text-blue-600 font-bold uppercase tracking-wide">
                    {selectedMed.substanceId}
                  </p>
                </div>
                
                {selectedMed.substance?.laake75Class && (
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Lääke75+ Luokka</div>
                    <div className={`text-2xl font-black w-12 h-12 flex items-center justify-center rounded-2xl text-white shadow-lg ${
                      ['C', 'D'].includes(selectedMed.substance.laake75Class) ? 'bg-red-500' : 'bg-green-500'
                    }`}>
                      {selectedMed.substance.laake75Class}
                    </div>
                  </div>
                )}
              </div>

              {/* CLINICAL INFO GRID */}
              <div className="grid grid-cols-2 gap-6">
                {/* WIKI NOTES */}
                <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Edit3 size={18} className="text-amber-500" />
                      <h3>Yhteisön muistiinpanot</h3>
                    </div>
                    <button 
                      onClick={() => isEditingNotes ? saveNotes() : setIsEditingNotes(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {isEditingNotes ? <><Save size={14}/> Tallenna</> : 'Muokkaa'}
                    </button>
                  </div>
                  {isEditingNotes ? (
                    <textarea 
                      className="w-full h-32 p-3 text-sm bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={tempNotes}
                      onChange={(e) => setTempNotes(e.target.value)}
                    />
                  ) : (
                    <div className="text-sm text-slate-600 leading-relaxed italic bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                      {selectedMed.substance?.communityNotes || "Ei merkintöjä. Lisää kliinisiä vinkkejä tästä lääkkeestä."}
                    </div>
                  )}
                </div>

                {/* KIDNEY & AGE INFO */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-slate-800 mb-3">
                      <Scale size={18} className="text-blue-500" />
                      <h3>Munuaisten vajaatoiminta (GFR)</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {selectedMed.substance?.gfrGuidelines || "Ei erityisiä GFR-ohjeita tässä rekisterissä."}
                    </p>
                  </div>
                  
                  {selectedMed.substance?.laake75Comment && (
                    <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl">
                      <div className="flex items-center gap-2 font-bold mb-3">
                        <HeartPulse size={18} className="text-red-400" />
                        <h3>Lääke75+ Kommentti</h3>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {selectedMed.substance.laake75Comment}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* PACKAGE TABLE */}
              <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Saatavilla olevat pakkaukset</h3>
                  {selectedMed.prescriptionTerm && (
                    <div className="flex items-center gap-2 text-red-600 text-[10px] font-black uppercase bg-red-50 px-3 py-1 rounded-lg">
                      <AlertCircle size={14} />
                      {selectedMed.prescriptionTerm}
                    </div>
                  )}
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                      <th className="px-6 py-4">Vahvuus</th>
                      <th className="px-6 py-4">VNR</th>
                      <th className="px-6 py-4">Pakkauskoko</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMed.packages.map((pkg: any) => (
                      <tr key={pkg.vnr} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-700">{pkg.strength || selectedMed.strength}</span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">{pkg.vnr}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{pkg.sizeText}</td>
                        <td className="px-6 py-4 text-right">
                          {pkg.isAvailable ? (
                            <span className="flex items-center justify-end gap-1 text-green-600 font-bold text-[10px] uppercase">
                              <CheckCircle2 size={12} /> Myynnissä
                            </span>
                          ) : (
                            <span className="flex items-center justify-end gap-1 text-slate-300 font-bold text-[10px] uppercase italic">
                              <XCircle size={12} /> Ei myynnissä
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
              <div className="p-8 bg-white rounded-full shadow-inner">
                <Search size={64} className="opacity-20" />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest">Valitse lääke aloittaaksesi</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
