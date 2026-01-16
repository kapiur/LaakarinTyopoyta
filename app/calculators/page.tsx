"use client";
import { useState, useEffect } from 'react';
import { 
  Calculator, Settings, Plus, Trash2, Copy, Check
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
  const [chads, setChads] = useState({ chf: 0, ht: 0, age: 0, dm: 0, stroke: 0, vasc: 0, sex: 0 });

  // --- ЛОГИКА БД (PCA Library) ---
  useEffect(() => { fetchPcaLibrary(); }, []);

  const fetchPcaLibrary = async () => {
    try {
      const res = await fetch('/api/pca-library');
      if (res.ok) {
        const data = await res.json();
        setLibrary(data.map((d: any) => ({ id: d.id, n: d.name, s: d.strength })));
      }
    } catch (err) { console.error("Latausvirhe"); }
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

  // --- КОПИРОВАНИЕ ---
  const handleCopy = () => {
    let textToCopy = "";
    if (typeof result === 'string') {
      textToCopy = result;
    } else if (result && result.score !== undefined) {
      textToCopy = `Tulos: ${result.score}\n${result.desc}`;
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
      const { kas, ad, spd, days } = pca;
      const adNum = parseFloat(ad);
      const spdNum = parseFloat(spd);
      const dNum = parseInt(days);
      let out = "", totMl = 0, conc = "";

      selectedDrugs.forEach(drug => {
        const vNum = parseFloat(drug.val);
        if (isNaN(vNum) || vNum <= 0 || drug.name === 'none') return;
        const libData = library.find(l => l.n === drug.name);
        if (!libData) return;

        const mgT = vNum * dNum; 
        const ml = mgT / libData.s; 
        totMl += ml;
        out += `${drug.name}: ${vNum} mg/vrk (${mgT.toFixed(1)} mg/${dNum}vrk)\n`;
        conc += `${drug.name.split(' ')[0]}: ${(mgT / adNum).toFixed(libData.s < 1 ? 3 : 2)} mg/ml\n`;
      });

      if (!out) return;
      const bolus = (spdNum * 2).toFixed(1);
      const resText = `PCA-ohje:

PCA ${dNum} vrk, ${kas} ml kasetti.
${out}Lääkkeet yhteensä: ${totMl.toFixed(1)} ml
NaCl 0,9 % ad ${adNum} ml (${(adNum - totMl).toFixed(1)} ml)

Pitoisuudet:
${conc}
Nopeus: ${spdNum} ml/h
Bolus: ${bolus} ml (2x tuntiannos), 20 min lukitus.

Jos boluksia menee yli 6/8–24 h, nosta nopeutta +0.1 ml/h ad ${(spdNum + 0.2).toFixed(1)} ml/h ja bolusta +0.2 ml ad ${(parseFloat(bolus) + 0.4).toFixed(1)} ml.
Jos potilas sedatoituu liikaa, vähennä nopeutta –0.1 ml/h.`;
      setResult(resText);
    }

    if (activeTab === 'chads') {
      // Логика Käypä hoito: сумма баллов без пола
      let score = chads.chf + chads.ht + chads.age + chads.dm + chads.stroke + chads.vasc;
      // Пол дает +1 только если уже есть другие факторы риска ИЛИ возраст >= 65 (т.е. score > 0)
      if (chads.sex === 1 && score > 0) score += 1;
      
      const risks = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 12.5, 15.2];
      const strokeRisk = risks[score] || 15.2;
      let therapy = score === 0 ? "Ei antikoagulaatiota." : (score === 1 && chads.sex === 0 ? "Harkitse antikoagulaatiota." : "Suositellaan antikoagulaatiota.");
      
      setResult({ score, desc: `Aivoinfarktiriski: ${strokeRisk}% / vuosi.\n${therapy}` });
    }

    if (activeTab === 'bmi') {
      const h = parseFloat(bmi.h) / 100, w = parseFloat(bmi.w);
      const score = (w / (h * h)).toFixed(1);
      setResult({ score, desc: +score > 25 ? "Ylipaino" : "Normaali paino" });
    }

    if (activeTab === 'gfr') {
      const score = Math.round(((140 - +gfr.age) * +gfr.w * +gfr.sex) / +gfr.creat);
      setResult({ score, desc: "ml/min (Cockcroft-Gault)" });
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 pb-10 text-slate-900">
      {/* TABS */}
      <div className="flex bg-white p-1 rounded-xl border shadow-sm overflow-x-auto no-scrollbar gap-1">
        {['pca', 'chads', 'bmi', 'gfr'].map((id) => (
          <button key={id} onClick={() => { setActiveTab(id); setResult(null); }}
            className={`flex-1 py-2 px-4 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            {id}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: INPUT */}
        <div className="bg-white rounded-[2rem] p-6 border shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold uppercase text-blue-600 tracking-tight">{activeTab}-Laskuri</h2>
            <button onClick={() => setShowSettings(!showSettings)} className="text-slate-400 hover:text-blue-600 transition-colors"><Settings size={14} /></button>
          </div>

          <div className="space-y-3 min-h-[350px]">
            {activeTab === 'pca' && (
              <div className="space-y-3 animate-in fade-in duration-300">
                {showSettings && (
                  <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-2">
                    {['kas', 'ad', 'spd', 'days'].map(k => (
                      <div key={k}>
                        <label className="text-[8px] font-bold uppercase text-slate-400">{k}</label>
                        <input value={pca[k as keyof typeof pca]} onChange={e => setPca({...pca, [k]: e.target.value})} className="w-full p-1 border rounded text-xs font-bold" />
                      </div>
                    ))}
                  </div>
                )}
                {selectedDrugs.map((sd, i) => (
                  <div key={i} className="flex gap-2">
                    <select className="flex-1 p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" value={sd.name} onChange={e => { const n = [...selectedDrugs]; n[i].name = e.target.value; setSelectedDrugs(n); }}>
                      <option value="none">-- Valitse lääke --</option>
                      {library.map(l => <option key={l.id} value={l.n}>{l.n} ({l.s} mg/ml)</option>)}
                    </select>
                    <input placeholder="mg/vrk" className="w-24 p-2 border border-slate-100 rounded-xl text-center font-bold text-xs" value={sd.val} onChange={e => { const n = [...selectedDrugs]; n[i].val = e.target.value; setSelectedDrugs(n); }} />
                  </div>
                ))}
                <details className="text-[9px] font-bold text-slate-300 uppercase mt-4"><summary className="cursor-pointer hover:text-blue-600">Muokkaa lääkekirjastoa</summary>
                  <div className="p-3 bg-slate-50 rounded-xl mt-2 space-y-2 border border-slate-100">
                    <div className="flex gap-1">
                      <input placeholder="Nimi" value={newLibDrug.n} onChange={e => setNewLibDrug({...newLibDrug, n:e.target.value})} className="flex-1 p-2 border rounded text-xs"/>
                      <input placeholder="mg/ml" value={newLibDrug.s} onChange={e => setNewLibDrug({...newLibDrug, s:e.target.value})} className="w-16 p-2 border rounded text-xs"/>
                      <button onClick={addDrugToLib} className="p-2 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700"><Plus size={14}/></button>
                    </div>
                    {library.map(l => (
                      <div key={l.id} className="flex justify-between p-2 bg-white rounded border border-slate-100 text-[10px] items-center">
                        <span className="font-bold">{l.n} <span className="text-slate-400 font-normal">({l.s} mg/ml)</span></span>
                        <button onClick={() => removeDrugFromLib(l.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
            
            {activeTab === 'chads' && (
              <div className="grid grid-cols-1 gap-1.5 animate-in fade-in">
                {[
                  { l: "Sydämen vajaatoiminta (1p)", k: 'chf', v: 1 },
                  { l: "Hypertensio (1p)", k: 'ht', v: 1 },
                  { l: "Ikä ≥ 75 vuotta (2p)", k: 'age', v: 2 },
                  { l: "Ikä 65–74 vuotta (1p)", k: 'age', v: 1 },
                  { l: "Diabetes (1p)", k: 'dm', v: 1 },
                  { l: "Aivoinfarkti / TIA (2p)", k: 'stroke', v: 2 },
                  { l: "Valtimosairaus (1p)", k: 'vasc', v: 1 },
                  { l: "Nainen", k: 'sex', v: 1 },
                ].map(i => (
                  <button key={i.l} onClick={() => setChads({...chads, [i.k]: chads[i.k as keyof typeof chads] === i.v ? 0 : i.v})}
                    className={`p-3 text-left rounded-xl border text-[11px] font-bold transition-all ${chads[i.k as keyof typeof chads] === i.v ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-200'}`}>
                    {i.l}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'bmi' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Pituus (cm)</label>
                  <input value={bmi.h} onChange={e => setBmi({...bmi, h: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-lg" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Paino (kg)</label>
                  <input value={bmi.w} onChange={e => setBmi({...bmi, w: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-lg" />
                </div>
              </div>
            )}
          </div>
          <button onClick={executeCalculation} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg uppercase tracking-widest text-[11px] hover:bg-blue-700 active:scale-[0.98] transition-all">Muodosta / Laske</button>
        </div>

        {/* RIGHT: CONSOLE */}
        <div className="bg-[#0f172a] rounded-[2rem] p-6 shadow-2xl flex flex-col border border-slate-800">
          <p className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Tulos / Konsoli
          </p>
          <div className="flex-1 flex flex-col items-center justify-center">
            {result ? (
              <div className="w-full">
                {typeof result === 'string' ? (
                  <div className="space-y-4 w-full animate-in slide-in-from-bottom-2">
                    <pre className="text-left bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10 text-emerald-400 font-mono text-[11px] whitespace-pre-wrap leading-relaxed shadow-inner overflow-y-auto max-h-[400px] no-scrollbar">{result}</pre>
                    <button onClick={handleCopy} className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${copied ? 'bg-emerald-500 text-slate-900 shadow-lg' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'}`}>
                      {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'KOPIOITU' : 'KOPIOI OHJE'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center animate-in zoom-in duration-300">
                    <div className="text-8xl font-black text-emerald-400 tracking-tighter drop-shadow-sm">{result.score}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-4 tracking-widest bg-slate-800/50 px-6 py-2 rounded-full border border-slate-700/50 inline-block whitespace-pre-line leading-relaxed">
                      {result.desc}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="opacity-10 text-slate-400 text-center uppercase text-[10px] font-bold italic tracking-widest animate-pulse">
                <Calculator size={60} className="mx-auto mb-4" /> Valitse työkalu
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
