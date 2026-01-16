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

  // --- СОСТОЯНИЯ ---
  const [pca, setPca] = useState({ kas: '50', ad: '25', spd: '0.4', days: '3' });
  const [selectedDrugs, setSelectedDrugs] = useState([{ name: 'none', val: '' }, { name: 'none', val: '' }, { name: 'none', val: '' }]);
  const [library, setLibrary] = useState<any[]>([]);
  const [newLibDrug, setNewLibDrug] = useState({ n: '', s: '' });
  
  const [bmi, setBmi] = useState({ h: '175', w: '75' });
  const [gfr, setGfr] = useState({ age: '65', w: '75', creat: '100', sex: '1.23' });
  const [pain, setPain] = useState(0);
  const [gcs, setGcs] = useState({ e: 4, v: 5, m: 6 });
  const [chads, setChads] = useState({ age: 0, sex: 0, chf: 0, ht: 0, stroke: 0, vasc: 0, dm: 0 });
  const [news, setNews] = useState({ rr: 0, sao2: 0, o2: 0, sbp: 0, hr: 0, cons: 0 });
  const [peds, setPeds] = useState({ weight: '', doseMgKg: '', strength: '' });

  // --- ЛОГИКА БД (PCA) ---
  useEffect(() => { 
    fetchPcaLibrary(); 
  }, []);

  const fetchPcaLibrary = async () => {
    try {
      const res = await fetch('/api/pca-library');
      if (res.ok) {
        const data = await res.json();
        setLibrary(data.map((d: any) => ({ id: d.id, n: d.name, s: d.strength })));
      }
    } catch (err) {
      console.error("Virhe ladattaessa kirjastoa");
    }
  };

  const addDrugToLib = async () => {
    if (newLibDrug.n && newLibDrug.s) {
      const res = await fetch('/api/pca-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLibDrug.n, strength: newLibDrug.s })
      });
      if (res.ok) { fetchPcaLibrary(); setNewLibDrug({ n: '', s: '' }); }
    }
  };

  const removeDrugFromLib = async (id: number) => {
    await fetch(`/api/pca-library?id=${id}`, { method: 'DELETE' });
    fetchPcaLibrary();
  };

  const handleCopy = () => {
    let textToCopy = "";
    if (typeof result === 'string') {
      textToCopy = result;
    } else if (result && result.score) {
      textToCopy = `${result.score} (${result.desc})`;
    }
    
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // --- ФУНКЦИИ РАСЧЕТА ---
  const executeCalculation = () => {
    if (activeTab === 'pca') {
      let out = "", totMl = 0, conc = "";
      const dNum = parseFloat(pca.days), adNum = parseFloat(pca.ad), spdNum = parseFloat(pca.spd);
      selectedDrugs.forEach(drug => {
        const vNum = parseFloat(drug.val);
        if (drug.name === 'none' || isNaN(vNum)) return;
        const libData = library.find(l => l.n === drug.name);
        if (libData) {
          const mgT = vNum * dNum, ml = mgT / libData.s;
          totMl += ml;
          out += `${drug.name}: ${vNum} mg/vrk (${mgT.toFixed(1)} mg/${dNum}vrk) eli ${ml.toFixed(1)} ml\n`;
          conc += `${drug.name.split(' ')[0]}: ${(mgT / adNum).toFixed(libData.s < 1 ? 3 : 2)} mg/ml\n`;
        }
      });
      setResult(`PCA-ohje:\n\nPCA ${dNum} vrk, ${pca.kas} ml.\n${out}\nNaCl 0,9 % ad ${adNum} ml\n\nNopeus: ${spdNum} ml/h\nBolus: ${(spdNum * 2).toFixed(1)} ml`);
    }
    if (activeTab === 'bmi') {
      const h = parseFloat(bmi.h) / 100, w = parseFloat(bmi.w);
      const score = (w / (h * h)).toFixed(1);
      setResult({ score, desc: +score > 25 ? "Ylipaino" : "Normaali" });
    }
    if (activeTab === 'chads') {
      const score = Object.values(chads).reduce((a, b) => a + b, 0);
      setResult({ score, desc: score >= 2 ? "Korkea riski" : "Matala" });
    }
    if (activeTab === 'news') {
      const score = Object.values(news).reduce((a, b) => a + b, 0);
      setResult({ score, desc: score >= 5 ? "Kiireellinen arvio" : "Normaali" });
    }
    if (activeTab === 'gfr') {
      const score = Math.round(((140 - +gfr.age) * +gfr.w * +gfr.sex) / +gfr.creat);
      setResult({ score, desc: "ml/min (C-G)" });
    }
    if (activeTab === 'peds') {
      const res = (+peds.weight * +peds.doseMgKg) / +peds.strength;
      setResult(`Pedi-annos: ${(+peds.weight * +peds.doseMgKg).toFixed(1)} mg / ${res.toFixed(2)} ml`);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 pb-10 text-slate-900">
      {/* TABS (Компактно как на макете) */}
      <div className="flex bg-white p-1 rounded-xl border shadow-sm overflow-x-auto no-scrollbar gap-1">
        {['pca', 'chads', 'news', 'peds', 'bmi', 'gfr', 'gcs'].map((id) => (
          <button key={id} onClick={() => { setActiveTab(id); setResult(null); }}
            className={`flex-1 py-2 px-4 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            {id}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: INPUT AREA */}
        <div className="bg-white rounded-[2rem] p-6 border shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold uppercase text-blue-600">{activeTab}-Laskuri</h2>
            <button onClick={() => setShowSettings(!showSettings)} className="text-slate-400 hover:text-blue-600"><Settings size={14} /></button>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {activeTab === 'pca' && (
              <div className="space-y-3">
                {showSettings && (
                  <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border">
                    {['kas', 'ad', 'spd', 'days'].map(k => (
                      <div key={k}><label className="text-[8px] font-bold uppercase text-slate-400">{k}</label>
                      <input value={pca[k as keyof typeof pca]} onChange={e => setPca({...pca, [k]: e.target.value})} className="w-full p-1 border rounded text-xs" /></div>
                    ))}
                  </div>
                )}
                {selectedDrugs.map((sd, i) => (
                  <div key={i} className="flex gap-2">
                    <select className="flex-1 p-2 bg-slate-50 border rounded-xl text-xs font-bold" value={sd.name} onChange={e => { const n = [...selectedDrugs]; n[i].name = e.target.value; setSelectedDrugs(n); }}>
                      <option value="none">-- Tyhjä --</option>
                      {library.map(l => <option key={l.id} value={l.n}>{l.n} ({l.s})</option>)}
                    </select>
                    <input placeholder="mg" className="w-20 p-2 border rounded-xl text-center font-bold text-xs" value={sd.val} onChange={e => { const n = [...selectedDrugs]; n[i].val = e.target.value; setSelectedDrugs(n); }} />
                  </div>
                ))}
                <details className="text-[9px] font-bold text-slate-400 uppercase"><summary className="cursor-pointer">Kirjasto</summary>
                  <div className="p-3 bg-slate-50 rounded-xl mt-2 space-y-2">
                    <div className="flex gap-1"><input placeholder="Nimi" value={newLibDrug.n} onChange={e => setNewLibDrug({...newLibDrug, n:e.target.value})} className="flex-1 p-2 border rounded text-xs"/><input placeholder="mg/ml" value={newLibDrug.s} onChange={e => setNewLibDrug({...newLibDrug, s:e.target.value})} className="w-16 p-2 border rounded text-xs"/><button onClick={addDrugToLib} className="p-2 bg-blue-600 text-white rounded"><Plus size={14}/></button></div>
                    {library.map(l => <div key={l.id} className="flex justify-between p-1 bg-white rounded border"><span>{l.n}</span><button onClick={() => removeDrugFromLib(l.id)}><Trash2 size={12}/></button></div>)}
                  </div>
                </details>
              </div>
            )}
            
            {activeTab === 'bmi' && (
              <div className="space-y-4">
                <input placeholder="Pituus (cm)" value={bmi.h} onChange={e => setBmi({...bmi, h: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                <input placeholder="Paino (kg)" value={bmi.w} onChange={e => setBmi({...bmi, w: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              </div>
            )}
            
            {activeTab === 'gfr' && (
              <div className="space-y-3">
                <input placeholder="Ikä" value={gfr.age} onChange={e => setGfr({...gfr, age: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" />
                <input placeholder="Paino" value={gfr.w} onChange={e => setGfr({...gfr, w: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" />
                <input placeholder="Kreat" value={gfr.creat} onChange={e => setGfr({...gfr, creat: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" />
              </div>
            )}
          </div>
          <button onClick={executeCalculation} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg uppercase tracking-widest text-xs">Muodosta / Laske</button>
        </div>

        {/* RIGHT: CONSOLE (Темная) */}
        <div className="bg-[#0f172a] rounded-[2rem] p-8 shadow-2xl flex flex-col border border-slate-800">
          <p className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-widest mb-6">Tulos / Konsoli</p>
          <div className="flex-1 flex flex-col items-center justify-center">
            {result ? (
              <div className="w-full text-center">
                {typeof result === 'string' ? (
                  <div className="space-y-4 w-full">
                    <pre className="text-left bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10 text-emerald-400 font-mono text-xs whitespace-pre-wrap">{result}</pre>
                    <button onClick={handleCopy} className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${copied ? 'bg-emerald-500 text-slate-900' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                      {copied ? 'KOPIOITU' : 'KOPIOI OHJE'}
                    </button>
                  </div>
                ) : (
                  <div className="animate-in zoom-in">
                    <div className="text-7xl font-black text-emerald-400 tracking-tighter">{result.score}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-4 tracking-widest">{result.desc}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="opacity-10 text-slate-400 text-center uppercase text-[10px] font-bold italic tracking-widest">
                <Calculator size={60} className="mx-auto mb-4" /> Valitse työkalu
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
