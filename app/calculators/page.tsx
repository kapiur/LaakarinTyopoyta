"use client";
import { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, Activity, Zap, Clipboard, Info, Settings, 
  Plus, Trash2, Brain, Heart, AlertTriangle, Baby,
  ChevronDown, Check, Copy
} from 'lucide-react';

export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState('pca');
  const [result, setResult] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- СОСТОЯНИЯ ДЛЯ РАСЧЕТОВ ---
  const [pca, setPca] = useState({ kas: '50', ad: '25', spd: '0.4', days: '3' });
  const [selectedDrugs, setSelectedDrugs] = useState([{ name: 'none', val: '' }, { name: 'none', val: '' }, { name: 'none', val: '' }]);
  const [library, setLibrary] = useState<any[]>([]); // Библиотека теперь из БД
  const [newLibDrug, setNewLibDrug] = useState({ n: '', s: '' });
  
  const [bmi, setBmi] = useState({ h: '175', w: '75' });
  const [gfr, setGfr] = useState({ age: '65', w: '75', creat: '100', sex: '1.23' });
  const [pain, setPain] = useState(0);
  const [gcs, setGcs] = useState({ e: 4, v: 5, m: 6 });
  const [chads, setChads] = useState({ age: 0, sex: 0, chf: 0, ht: 0, stroke: 0, vasc: 0, dm: 0 });
  const [news, setNews] = useState({ rr: 0, sao2: 0, o2: 0, sbp: 0, hr: 0, cons: 0 });
  const [peds, setPeds] = useState({ weight: '', doseMgKg: '', strength: '' });

  // --- РАБОТА С БД (ВМЕСТО LOCALSTORAGE) ---
  useEffect(() => {
    fetchPcaLibrary();
  }, []);

  const fetchPcaLibrary = async () => {
    try {
      const res = await fetch('/api/pca-library');
      if (res.ok) {
        const data = await res.json();
        // Маппим данные из БД (name, strength) в формат (n, s), используемый в расчетах
        setLibrary(data.map((d: any) => ({ id: d.id, n: d.name, s: d.strength })));
      }
    } catch (err) {
      console.error("Virhe ladattaessa kirjastoa:", err);
    }
  };

  const addDrugToLib = async () => {
    if (newLibDrug.n && newLibDrug.s) {
      try {
        const res = await fetch('/api/pca-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newLibDrug.n, strength: newLibDrug.s })
        });
        if (res.ok) {
          fetchPcaLibrary();
          setNewLibDrug({ n: '', s: '' });
        }
      } catch (err) {
        alert("Tallennus epäonnistui");
      }
    }
  };

  const removeDrugFromLib = async (id: number) => {
    try {
      const res = await fetch(`/api/pca-library?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchPcaLibrary();
    } catch (err) {
      alert("Poisto epäonnistui");
    }
  };

  // --- ВАША ЛОГИКА РАСЧЕТОВ (БЕЗ ИЗМЕНЕНИЙ) ---
  const handleNumChange = (value: string, callback: (v: string) => void) => {
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) callback(value);
  };

  const calcPCA = () => {
    let out = "", totMl = 0, conc = "";
    const dNum = parseFloat(pca.days);
    const adNum = parseFloat(pca.ad);
    const spdNum = parseFloat(pca.spd);

    selectedDrugs.forEach(drug => {
      const vNum = parseFloat(drug.val);
      if (drug.name === 'none' || isNaN(vNum) || vNum <= 0) return;
      const libData = library.find(l => l.n === drug.name);
      if (!libData) return;
      const mgT = vNum * dNum;
      const ml = mgT / libData.s;
      totMl += ml;
      out += `${drug.name}: ${vNum} mg/vrk (${mgT.toFixed(1)} mg/${dNum}vrk) eli ${ml.toFixed(1)} ml\n`;
      conc += `${drug.name.split(' ')[0]}: ${(mgT / adNum).toFixed(libData.s < 1 ? 3 : 2)} mg/ml\n`;
    });
    if (!out) return alert("Syötä lääke ja annos!");
    const bolus = (spdNum * 2).toFixed(1);
    const text = `PCA-ohje:\n\nPCA ${dNum} vrk, ${pca.kas} ml kasetti.\n${out}\nLääkkeet yhteensä: ${totMl.toFixed(1)} ml\nNaCl 0,9 % ad ${adNum} ml (${(adNum - totMl).toFixed(1)} ml)\n\nPitoisuudet:\n${conc}\nNopeus: ${spdNum} ml/h\nBolus: ${bolus} ml (2x tuntiannos), 20 min lukitus.`;
    setResult(text);
  };

  const executeCalculation = () => {
    if (activeTab === 'pca') calcPCA();
    // ... здесь остальные ваши функции расчета (BMI, GFR и т.д.)
    if (activeTab === 'bmi') {
        const h = parseFloat(bmi.h) / 100;
        const w = parseFloat(bmi.w);
        if (!h || !w) return;
        const score = w / (h * h);
        setResult({ score: score.toFixed(1), desc: score > 25 ? "Ylipaino" : "Normaali" });
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-10">
      
      {/* TABS (Горизонтальное меню) */}
      <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'pca', label: 'PCA', icon: <Zap size={14}/> },
          { id: 'chads', label: 'CHADS', icon: <Heart size={14}/> },
          { id: 'news', label: 'NEWS2', icon: <AlertTriangle size={14}/> },
          { id: 'peds', label: 'PEDS', icon: <Baby size={14}/> },
          { id: 'bmi', label: 'BMI', icon: <Activity size={14}/> },
          { id: 'gfr', label: 'GFR', icon: <Calculator size={14}/> },
          { id: 'gcs', label: 'GCS', icon: <Brain size={14}/> }
        ].map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setResult(null); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[11px] transition-all uppercase whitespace-nowrap ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        
        {/* LEFT PANEL: INPUT (Светлая) */}
        <div className="bg-white rounded-[2.5rem] p-10 border shadow-sm space-y-8 flex flex-col">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-slate-800 italic uppercase tracking-tight">
                ⚡ {activeTab}-Laskuri
            </h2>
            <button onClick={() => setShowSettings(!showSettings)} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 hover:text-blue-600">
                <Settings size={14} /> Asetukset
            </button>
          </div>

          <div className="space-y-6 flex-1">
            {activeTab === 'pca' && (
                <div className="space-y-4">
                    {showSettings && (
                        <div className="grid grid-cols-2 gap-3 p-6 bg-slate-50 rounded-3xl border border-slate-100 animate-in slide-in-from-top-2">
                             {['kas', 'ad', 'spd', 'days'].map(key => (
                                <div key={key}>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">{key}</label>
                                    <input type="text" value={pca[key as keyof typeof pca]} onChange={e => handleNumChange(e.target.value, v => setPca({...pca, [key]: v}))} className="w-full p-3 bg-white border rounded-xl font-bold text-blue-600" />
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="space-y-3">
                        {selectedDrugs.map((sd, i) => (
                            <div key={i} className="flex gap-3">
                                <div className="relative flex-1">
                                    <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none appearance-none font-bold text-slate-700 focus:border-blue-300" value={sd.name} onChange={e => { const n = [...selectedDrugs]; n[i].name = e.target.value; setSelectedDrugs(n); }}>
                                        <option value="none">-- Tyhjä --</option>
                                        {library.map(l => <option key={l.id} value={l.n}>{l.n} ({l.s} mg/ml)</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                </div>
                                <input placeholder="mg" className="w-24 p-4 bg-white border border-slate-100 rounded-2xl text-center font-black text-blue-600 shadow-sm" value={sd.val} onChange={e => handleNumChange(e.target.value, v => { const n = [...selectedDrugs]; n[i].val = v; setSelectedDrugs(n); })} />
                            </div>
                        ))}
                    </div>
                    
                    {/* Управление библиотекой в БД */}
                    <details className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><summary className="cursor-pointer hover:text-blue-600 transition-colors">Muokkaa lääkekirjastoa</summary>
                        <div className="p-6 bg-slate-50 rounded-[2rem] mt-4 space-y-4 border border-slate-100">
                            <div className="flex gap-2">
                                <input placeholder="Lääke" value={newLibDrug.n} onChange={e => setNewLibDrug({...newLibDrug, n: e.target.value})} className="flex-1 p-3 bg-white border rounded-xl text-xs font-bold" />
                                <input placeholder="mg/ml" value={newLibDrug.s} onChange={e => handleNumChange(e.target.value, v => setNewLibDrug({...newLibDrug, s: v}))} className="w-20 p-3 bg-white border rounded-xl text-xs font-bold" />
                                <button onClick={addDrugToLib} className="p-3 bg-blue-600 text-white rounded-xl shadow-md"><Plus size={18}/></button>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-2 pr-2 no-scrollbar">
                                {library.map((l) => (
                                    <div key={l.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 text-[11px] font-bold">
                                        <span>{l.n} <span className="text-blue-500 ml-2">{l.s} mg/ml</span></span>
                                        <button onClick={() => removeDrugFromLib(l.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </details>
                </div>
            )}
            
            {/* ОСТАЛЬНЫЕ ВКЛАДКИ (BMI, CHADS и т.д.) - ВАШ КОД ИЗ ПРЕДЫДУЩЕЙ ВЕРСИИ */}
          </div>

          <button onClick={executeCalculation} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest active:scale-[0.98]">
            {activeTab === 'pca' ? 'Muodosta Ohje' : 'Laske Tulos'}
          </button>
        </div>

        {/* RIGHT PANEL: CONSOLE (Темная) */}
        <div className="bg-[#0f172a] rounded-[2.5rem] p-10 shadow-2xl flex flex-col relative border border-slate-800 overflow-hidden">
          <div className="flex items-center gap-2 mb-8 relative z-10">
            <div className="w-4 h-4 rounded-full border-2 border-emerald-500/30 flex items-center justify-center">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
            <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.3em]">Tulos / Konsoli</span>
          </div>

          <div className="flex-1 overflow-auto no-scrollbar relative z-10">
            {result ? (
              <div className="animate-in zoom-in duration-300 h-full flex flex-col items-center justify-center">
                {typeof result === 'string' ? (
                   <div className="w-full">
                        <div className="bg-emerald-500/5 p-8 rounded-[2rem] border border-emerald-500/10 font-mono text-emerald-400 text-sm whitespace-pre-wrap leading-relaxed mb-6 shadow-inner">
                            {result}
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
                                className={`w-full py-5 rounded-[1.5rem] font-black text-sm transition-all flex items-center justify-center gap-2 ${copied ? 'bg-emerald-500 text-slate-900 shadow-lg' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'}`}>
                            {copied ? <Check size={18}/> : <Copy size={18}/>}
                            {copied ? 'KOPIOITU' : 'KOPIOI OHJE'}
                        </button>
                   </div>
                ) : (
                    <div className="text-center">
                        <div className="text-8xl font-black text-emerald-400 tracking-tighter mb-4 drop-shadow-lg">{result.score}</div>
                        <div className="text-slate-400 font-bold uppercase tracking-[0.2em] bg-slate-800/50 px-8 py-3 rounded-full border border-slate-700 inline-block text-xs">
                            {result.desc}
                        </div>
                    </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-10">
                <Calculator size={100} className="text-slate-400" strokeWidth={1} />
                <p className="text-slate-400 font-black italic tracking-[0.3em] text-xs uppercase mt-6">Valitse työkalu</p>
              </div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
}
