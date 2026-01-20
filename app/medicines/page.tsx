"use client";

import { useState, useEffect } from 'react';
import { 
  Search, Database, ChevronRight, Loader2, MessageSquare, 
  Edit3, Save, HeartPulse, CheckCircle2, XCircle, Pill 
} from 'lucide-react';

export default function MedicinesPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  
  // Состояния для редактирования заметок
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Поиск
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

  // Функция сохранения заметок в БД
  const handleSaveNotes = async () => {
    if (!selectedMed?.substanceId) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/substances/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          substanceId: selectedMed.substanceId, 
          notes: tempNotes 
        }),
      });
      if (res.ok) {
        // Обновляем локальное состояние, чтобы изменения сразу отобразились
        setSelectedMed({
          ...selectedMed,
          substance: { ...selectedMed.substance, communityNotes: tempNotes }
        });
        setIsEditingNotes(false);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* ЛЕВАЯ ПАНЕЛЬ */}
      <aside className="w-[420px] bg-white border-r flex flex-col shadow-xl z-20">
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

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {results.map((med) => (
            <button 
              key={med.id} 
              onClick={() => {
                setSelectedMed(med);
                setTempNotes(med.substance?.communityNotes || '');
                setIsEditingNotes(false);
              }}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                selectedMed?.name === med.name ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-50 hover:border-blue-200'
              }`}
            >
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <span className="font-black text-sm uppercase leading-tight">{med.name}</span>
                  {/* ОТОБРАЖЕНИЕ СИЛЫ (Vahvuus) в списке */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${selectedMed?.name === med.name ? 'bg-blue-500' : 'bg-slate-100 text-slate-500'}`}>
                    {med.strength || ""}
                  </span>
                </div>
                <div className="text-[10px] font-bold uppercase opacity-60 mt-1 tracking-widest italic">
                  {med.substanceId}
                </div>
              </div>
              <ChevronRight size={18} className="ml-2 opacity-50" />
            </button>
          ))}
        </div>
      </aside>

      {/* ПРАВАЯ ПАНЕЛЬ */}
      <main className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
        {selectedMed ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-200/60">
              <div className="flex items-baseline gap-4 mb-2">
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter">{selectedMed.name}</h2>
                <span className="text-2xl font-bold text-slate-400">{selectedMed.strength}</span>
              </div>
              <button 
                onClick={() => setQuery(selectedMed.substanceId)}
                className="text-xl text-blue-600 font-bold uppercase tracking-[0.2em] hover:underline"
              >
                {selectedMed.substanceId}
              </button>
            </div>

            {/* РЕДАКТИРУЕМЫЕ ЗАМЕТКИ */}
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3 font-black text-slate-800 uppercase tracking-widest text-xs">
                  <MessageSquare className="text-amber-500" size={20} />
                  <h3>Yhteisön muistiinpanot (Wiki)</h3>
                </div>
                <div className="flex gap-2">
                  {isEditingNotes ? (
                    <button 
                      disabled={isSaving}
                      onClick={handleSaveNotes}
                      className="px-6 py-2 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase hover:bg-emerald-700 transition-all flex items-center gap-2"
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14}/>}
                      Tallenna
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsEditingNotes(true)}
                      className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                      <Edit3 size={14}/> Muokkaa
                    </button>
                  )}
                </div>
              </div>
              <div className="p-8">
                {isEditingNotes ? (
                  <textarea 
                    autoFocus
                    className="w-full h-48 p-6 text-lg bg-slate-50 border-2 border-blue-100 rounded-3xl outline-none focus:border-blue-500 transition-all font-medium"
                    value={tempNotes}
                    onChange={(e) => setTempNotes(e.target.value)}
                    placeholder="Esim. 'Puolita annos iäkkäillä' или 'Varo interaktiota varfariinin kanssa'..."
                  />
                ) : (
                  <div className="prose prose-slate">
                    <p className="text-xl text-slate-600 leading-relaxed font-medium italic">
                      {selectedMed.substance?.communityNotes || "Ei vielä kliinisiä huomioita. Ole ensimmäinen и lisää muistiinpano."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ТАБЛИЦА УПАКОВОК */}
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Pakkaustiedot ja Vahvuus</h3>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-8 py-4">VNR</th>
                    <th className="px-8 py-4">Vahvuus / Muoto</th>
                    <th className="px-8 py-4">Pakkauskoko</th>
                    <th className="px-8 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedMed.packages?.map((pkg: any) => (
                    <tr key={pkg.vnr} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 font-bold text-blue-600">{pkg.vnr}</td>
                      <td className="px-8 py-6 font-black text-slate-900">{selectedMed.strength}</td>
                      <td className="px-8 py-6 text-slate-600 font-medium">{pkg.sizeText || 'Vakio'}</td>
                      <td className="px-8 py-6 text-right">
                        {pkg.isAvailable ? (
                          <span className="text-emerald-500 text-[10px] font-black uppercase"><CheckCircle2 size={12} className="inline mr-1"/> Saatavilla</span>
                        ) : (
                          <span className="text-slate-300 text-[10px] font-black uppercase italic"><XCircle size={12} className="inline mr-1"/> Loppu</span>
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
            <Pill size={64} className="opacity-10 mb-4" />
            <p className="font-black uppercase tracking-[0.4em] text-xs">Valitse lääke</p>
          </div>
        )}
      </main>
    </div>
  );
}
