"use client";
import { useState, useEffect } from 'react';
import { 
  Search, Pill, AlertCircle, Info, 
  Stethoscope, Activity, ChevronRight, Loader2,
  ExternalLink, FileText, ShieldCheck, Globe
} from 'lucide-react';

export default function MedicinesPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 1) {
        setLoading(true);
        try {
          const res = await fetch(`/api/medicines?q=${query}`);
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

  // НАДЕЖНЫЕ ССЫЛКИ НА ИНСТРУКЦИИ
  const getLääkeinfoLink = (med: any) => {
    // Lääkeinfo haku nimen perusteella
    return `https://laakeinfo.fi/Results.aspx?q=${encodeURIComponent(med.name)}`;
  };

  const getFimeaLink = (med: any) => {
    // Fimean lääkehaku (vnr on tarkin hakuun)
    const searchParam = med.vnr && !med.vnr.startsWith('ID-') ? med.vnr : med.name;
    return `https://nethaku.fimea.fi/Search.aspx?q=${encodeURIComponent(searchParam)}`;
  };

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Lääketietokanta</h1>
          <p className="text-slate-500 text-sm mt-1">Viralliset valmisteyhteenvedot ja ohjeet.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            autoFocus
            placeholder="Hae nimellä или aineella..." 
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all shadow-inner"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={18} />}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* RESULTS LIST */}
        <div className="col-span-12 md:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Tulokset ({results.length})</h3>
          
          <div className="space-y-2 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
            {results.map((med) => (
              <div 
                key={med.vnr} 
                onClick={() => setSelectedMed(med)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-md flex items-center justify-between group ${selectedMed?.vnr === med.vnr ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-900 hover:border-blue-300'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${selectedMed?.vnr === med.vnr ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500'}`}>
                    <Pill size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{med.name}</div>
                    <div className={`text-[10px] uppercase font-bold tracking-wider ${selectedMed?.vnr === med.vnr ? 'text-blue-100' : 'text-slate-400'}`}>
                      {med.substance} • {med.strength}
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className={`transition-transform group-hover:translate-x-1 ${selectedMed?.vnr === med.vnr ? 'text-white' : 'text-slate-300'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* DETAILS VIEW */}
        <div className="col-span-12 md:col-span-7">
          {selectedMed ? (
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden sticky top-6 animate-in slide-in-from-right-4 duration-300">
              <div className="p-8 border-b bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                      VNR {selectedMed.vnr}
                    </span>
                    <h2 className="text-3xl font-bold text-slate-900 mt-2">{selectedMed.name}</h2>
                    <p className="text-lg text-slate-500 font-medium">{selectedMed.substance} {selectedMed.strength}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Muoto</div>
                    <div className="text-sm font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200 mt-1">{selectedMed.form}</div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* OFFICIAL SPC LINKS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <ShieldCheck size={18} className="text-blue-600" />
                    <h3>Valmisteyhteenveto (SPC)</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <a 
                      href={getLääkeinfoLink(selectedMed)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-bold text-sm"
                    >
                      <Globe size={18} />
                      Avaa Lääkeinfo.fi
                    </a>
                    <a 
                      href={getFimeaLink(selectedMed)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 p-4 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 transition-all font-bold text-sm"
                    >
                      <FileText size={18} />
                      Fimean Lääkehaku
                    </a>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    * Linkki avaa virallisen hakuportalin. Valitse tuloslistalta oikea pakkaus lukeaksesi koko valmisteyhteenvedon.
                  </p>
                </div>

                {/* INDICATIONS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Stethoscope size={18} className="text-blue-500" />
                    <h3>Käyttötarkoitus</h3>
                  </div>
                  <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 text-slate-700 leading-relaxed text-sm italic">
                    {selectedMed.indications || "Tietoa ei saatavilla perusrekisterissä."}
                  </div>
                </div>

                {/* FOOTER */}
                <div className="pt-4 border-t flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>ATC-Koodi: {selectedMed.atcCode || 'N/A'}</span>
                  <span>Päivitetty: {new Date(selectedMed.updatedAt).toLocaleDateString('fi-FI')}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <Info size={48} className="mb-4 opacity-20" />
              <p className="font-bold uppercase text-[10px] tracking-widest">Valitse lääke nähdäksesi SPC-linkit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
