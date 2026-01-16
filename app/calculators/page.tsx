"use client";
import { useState, useEffect } from 'react';
import { 
  Calculator, Settings, Plus, Trash2, Copy, Check, Zap, Heart, Activity, Baby, ChevronDown
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
  const [peds, setPeds] = useState({ weight: '', doseMgKg: '', strength: '' });
  
  const [chads, setChads] = useState({ chf: 0, ht: 0, age: 0, dm: 0, stroke: 0, vasc: 0, sex: 0 });
  const [hasbled, setHasbled] = useState({ sbp: 0, renal: 0, liver: 0, stroke: 0, bleed: 0, inr: 0, age: 0, drugs: 0, alc: 0 });

  // --- ЛОГИКА БД ---
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

  const handleCopy = () => {
    let textToCopy = typeof result === 'string' ? result : `Tulos: ${result?.score}\n${result?.desc}`;
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
      const adNum = parseFloat(ad), spdNum = parseFloat(spd), dNum = parseInt(days);
      let out = "", totMl = 0, conc = "";
      selectedDrugs.forEach(drug => {
        const vNum = parseFloat(drug.val);
        if (isNaN(vNum) || vNum <= 0 || drug.name === 'none') return;
        const libData = library.find(l => l.n === drug.name);
        if (!libData) return;
        const mgT = vNum * dNum, ml = mgT / libData.s;
        totMl += ml;
        out += `${drug.name}: ${vNum} mg/vrk (${mgT.toFixed(1)} mg/${dNum}vrk)\n`;
        conc += `${drug.name.split(' ')[0]}: ${(mgT / adNum).toFixed(libData.s < 1 ? 3 : 2)} mg/ml\n`;
      });
      if (!out) return;
      const bolus = (spdNum * 2).toFixed(1);
      setResult(`PCA-ohje:\n\nPCA ${dNum} vrk, ${kas} ml kasetti.\n${out}Lääkkeet yhteensä: ${totMl.toFixed(1)} ml\nNaCl 0,9 % ad ${adNum} ml (${(adNum - totMl).toFixed(1)} ml)\n\nPitoisuudet:\n${conc}\nNopeus: ${spdNum} ml/h\nBolus: ${bolus} ml (2x tuntiannos), 20 min lukitus.\n\nJos boluksia menee yli 6/8–24 h, nosta nopeutta +0.1 ml/h ad ${(spdNum + 0.2).toFixed(1)} ml/h ja bolusta +0.2 ml ad ${(parseFloat(bolus) + 0.4).toFixed(1)} ml.\nJos potilas sedatoituu liikaa, vähennä nopeutta –0.1 ml/h.`);
    }

    if (activeTab === 'chads') {
      let score = chads.chf + chads.ht + chads.age + chads.dm + chads.stroke + chads.vasc;
      if (chads.sex === 1 && score > 0) score += 1;
      const risks = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 12.5, 15.2];
      const strokeRisk = risks[score] || 15.2;
      const hbScore = Object.values(hasbled).reduce((a, b) => a + b, 0);
      setResult({ type: 'dual', score, hbScore, desc: `Aivoinfarktiriski: ${strokeRisk}% / vuosi.\nHAS-BLED: ${hbScore} p (${hbScore >= 3 ? 'SUURI' : 'EI SUURI'} VUOTORISKI).` });
    }

    if (activeTab === 'peds') {
      const w = parseFloat(peds.weight), d = parseFloat(peds.doseMgKg), s = parseFloat(peds.strength);
      if (!w || !d || !s) return alert("Täytä kaikki kentät");
      const totalMg = w * d, totalMl = totalMg / s;
      setResult(`PEDIATRINEN ANNOS:\n\nPaino: ${w} kg\nAnnos: ${d} mg/kg\nVahvuus: ${s} mg/ml\n\nKerta-annos: ${totalMg.toFixed(2)} mg\nTilavuus: ${totalMl.toFixed(2)} ml`);
    }

    if (activeTab === 'bmi') {
      const h = parseFloat(bmi.h) / 100, w = parseFloat(bmi.w);
      if (!h || !w) return alert("Syötä pituus ja paino");
      const score = (w / (h * h)).toFixed(1);
      setResult({ type: 'single', score, desc: +score > 25 ? "Ylipaino" : "Normaali paino" });
    }

    if (activeTab === 'gfr') {
      const score = Math.round(((140 - +gfr.age) * +gfr.w * +gfr.sex) / +gfr.creat);
      setResult({ type: 'single', score, desc: "ml/min (Cockcroft-Gault)" });
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 pb-10 text-slate-900">
      <div className="flex bg-white p-1 rounded-xl border shadow-sm overflow-x-auto no-scrollbar gap-1">
        {[
          { id: 'pca', label: 'PCA', icon: <Zap size={14}/> },
          { id: 'chads', label: 'CHADS', icon: <Heart size={14}/> },
          { id: 'peds', label: 'PEDS', icon: <Baby size={14}/> },
          { id: 'bmi', label: 'BMI', icon: <Activity size={14}/> },
          { id: 'gfr', label: 'GFR', icon: <Calculator size={14}/> }
        ].map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setResult(null); }}
            className={`flex-1 py-2 px-4 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-[2rem] p-6 border shadow-sm space-y-4 min-h-[500px] overflow-y-auto no-scrollbar max-h-[750px]">
          <h2 className="text-lg font-bold uppercase text-blue-600 tracking-tight">{activeTab}-Laskuri</h2>

          {activeTab === 'pca' && (
            <div className="space-y-3 animate-in fade-in">
              {showSettings && (
                <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border mb-2">
                  {['kas', 'ad', 'spd', 'days'].map(k => (
                    <div key={k}><label className="text-[8px] font-bold uppercase text-slate-400">{k}</label>
                    <input value={pca[k as keyof typeof pca]} onChange={e => setPca({...pca, [k]: e.target.value})} className="w-full p-1 border rounded text-xs font-bold" /></div>
                  ))}
                </div>
              )}
              {selectedDrugs.map((sd, i) => (
                <div key={i} className="flex gap-2">
                  <select className="flex-1 p-2 bg-slate-50 border rounded-xl text-xs font-bold" value={sd.name} onChange={e => { const n = [...selectedDrugs]; n[i].name = e.target.value; setSelectedDrugs(n); }}>
                    <option value="none">-- Valitse lääke --</option>
                    {library.map(l => <option key={l.id} value={l.n}>{l.n}</option>)}
                  </select>
                  <input placeholder="mg/vrk" className="w-24 p-2 border rounded-xl text-center font-bold text-xs shadow-sm" value={sd.val} onChange={e => { const n = [...selectedDrugs]; n[i].val = e.target.value; setSelectedDrugs(n); }} />
                </div>
              ))}
              
              <div className="flex justify-between items-center pt-2">
                <button onClick={() => setShowSettings(!showSettings)} className="text-[10px] font-bold text-slate-300 uppercase">⚙ Asetukset</button>
              </div>

              {/* УПРАВЛЕНИЕ БИБЛИОТЕКОЙ (БД) */}
              <div className="mt-6 p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">Lääkekirjasto (DB)</p>
                <div className="flex gap-1">
                  <input placeholder="Nimi" value={newLibDrug.n} onChange={e => setNewLibDrug({...newLibDrug, n:e.target.value})} className="flex-1 p-2 border rounded-xl text-[10px] font-bold shadow-sm"/>
                  <input placeholder="mg/ml" value={newLibDrug.s} onChange={e => setNewLibDrug({...newLibDrug, s:e.target.value})} className="w-16 p-2 border rounded-xl text-[10px] font-bold shadow-sm"/>
                  <button onClick={addDrugToLib} className="p-2 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-all"><Plus size={16}/></button>
                </div>
                <div className="max-h-32 overflow-y-auto pr-1 no-scrollbar space-y-1">
                  {library.map(l => (
                    <div key={l.id} className="flex justify-between p-2 bg-white rounded-lg border border-slate-100 text-[10px] items-center shadow-sm">
                      <span className="font-bold">{l.n} <span className="text-slate-400 font-normal">({l.s} mg/ml)</span></span>
                      <button onClick={() => removeDrugFromLib(l.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'peds' && (
            <div className="space-y-4 animate-in fade-in">
              <div><label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Paino (kg)</label>
              <input value={peds.weight} onChange={e => setPeds({...peds, weight: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
              <div><label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Annos (mg/kg)</label>
              <input value={peds.doseMgKg} onChange={e => setPeds({...peds, doseMgKg: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
              <div><label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Vahvuus (mg/ml)</label>
              <input value={peds.strength} onChange={e => setPeds({...peds, strength: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
            </div>
          )}

          {/* CHADS, BMI, GFR inputs here... (сохранены из предыдущего кода) */}
          {activeTab === 'chads' && (
            <div className="space-y-4 animate-in fade-in max-h-[450px] overflow-y-auto no-scrollbar">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">Infarktiriski</p>
              <div className="grid grid-cols-1 gap-1">
                {[{l:"Sydämen vajaatoiminta",k:'chf',v:1},{l:"Hypertensio",k:'ht',v:1},{l:"Ikä ≥ 75",k:'age',v:2},{l:"Ikä 65-74",k:'age',v:1},{l:"Diabetes",k:'dm',v:1},{l:"Aivoinfarkti/TIA",k:'stroke',v:2},{l:"Valtimosairaus",k:'vasc',v:1},{l:"Nainen",k:'sex',v:1}].map(i => (
                  <button key={i.l} onClick={() => setChads({...chads, [i.k]: chads[i.k as keyof typeof chads] === i.v ? 0 : i.v})} className={`p-2 text-left rounded-lg border text-[10px] font-bold ${chads[i.k as keyof typeof chads] === i.v ? 'bg-blue-600 text-white' : 'bg-slate-50'}`}>{i.l}</button>
                ))}
              </div>
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest border-b border-red-100 pb-1 mt-4">HAS-BLED</p>
              <div className="grid grid-cols-1 gap-1">
                {[{l:"RR-syst. > 160",k:'sbp',v:1},{l:"Munuaisten vajaat.",k:'renal',v:1},{l:"Maksan vajaat.",k:'liver',v:1},{l:"Aiempi vuoto",k:'bleed',v:1},{l:"Labiili INR",k:'inr',v:1},{l:"Ikä > 65",k:'age',v:1},{l:"Lääkitys",k:'drugs',v:1},{l:"Alkoholi",k:'alc',v:1}].map(i => (
                  <button key={i.l} onClick={() => setHasbled({...hasbled, [i.k]: hasbled[i.k as keyof typeof hasbled] === i.v ? 0 : i.v})} className={`p-2 text-left rounded-lg border text-[10px] font-bold ${hasbled[i.k as keyof typeof hasbled] === i.v ? 'bg-red-600 text-white' : 'bg-red-50'}`}>{i.l}</button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'bmi' && (
            <div className="space-y-4 animate-in fade-in">
              <input placeholder="Pituus (cm)" value={bmi.h} onChange={e => setBmi({...bmi, h: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
              <input placeholder="Paino (kg)" value={bmi.w} onChange={e => setBmi({...bmi, w: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
            </div>
          )}

          {activeTab === 'gfr' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Ikä" value={gfr.age} onChange={e => setGfr({...gfr, age: e.target.value})} className="p-3 bg-slate-50 border rounded-xl font-bold" />
                <input placeholder="Paino" value={gfr.w} onChange={e => setGfr({...gfr, w: e.target.value})} className="p-3 bg-slate-50 border rounded-xl font-bold" />
              </div>
              <input placeholder="Kreat" value={gfr.creat} onChange={e => setGfr({...gfr, creat: e.target.value})} className="p-3 bg-slate-50 border rounded-xl font-bold w-full" />
              <div className="flex gap-2">
                <button onClick={() => setGfr({...gfr, sex: '1.23'})} className={`flex-1 p-2 rounded-xl border text-[10px] font-bold ${gfr.sex === '1.23' ? 'bg-blue-600 text-white' : 'bg-slate-50'}`}>Mies</button>
                <button onClick={() => setGfr({...gfr, sex: '1.04'})} className={`flex-1 p-2 rounded-xl border text-[10px] font-bold ${gfr.sex === '1.04' ? 'bg-blue-600 text-white' : 'bg-slate-50'}`}>Nainen</button>
              </div>
            </div>
          )}

          <button onClick={executeCalculation} className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-[11px] shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest mt-auto">Muodosta / Laske</button>
        </div>

        {/* RIGHT PANEL (CONSOLE) */}
        <div className="bg-[#0f172a] rounded-[2rem] p-6 shadow-2xl flex flex-col border border-slate-800 min-h-[450px]">
          <p className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-widest mb-6 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Tulos / Konsoli</p>
          <div className="flex-1 flex flex-col items-center justify-center">
            {result ? (
              <div className="w-full">
                {typeof result === 'string' ? (
                  <div className="space-y-4 w-full">
                    <pre className="text-left bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10 text-emerald-400 font-mono text-[11px] whitespace-pre-wrap leading-relaxed shadow-inner max-h-[400px] overflow-y-auto no-scrollbar">{result}</pre>
                    <button onClick={handleCopy} className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${copied ? 'bg-emerald-500 text-slate-900 shadow-lg' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'}`}>
                      {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'KOPIOITU' : 'KOPIOI'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center animate-in zoom-in duration-300">
                    {result.type === 'dual' ? (
                      <div className="flex justify-around items-end mb-8">
                        <div className="flex flex-col items-center">
                          <div className="text-6xl font-black text-emerald-400">{result.score}</div>
                          <div className="text-[8px] font-bold text-slate-500 uppercase">CHADS-VASc</div>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className={`text-6xl font-black ${result.hbScore >= 3 ? 'text-red-500' : 'text-emerald-400'}`}>{result.hbScore}</div>
                          <div className="text-[8px] font-bold text-slate-500 uppercase">HAS-BLED</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-8xl font-black text-emerald-400 tracking-tighter drop-shadow-sm mb-4">{result.score}</div>
                    )}
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-800/50 px-6 py-4 rounded-3xl border border-slate-700/50 inline-block whitespace-pre-line leading-relaxed shadow-sm">
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
