"use client";
import { useState, useEffect } from 'react';
import { 
  Calculator, Settings, Plus, Trash2, Copy, Check, Zap, Heart, Activity, Baby, 
  FlaskConical, ClipboardList, Info, AlertTriangle, Scale
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
  const [peds, setPeds] = useState({ 
    weight: '', doseMgKg: '', strength: '', timesPerDay: '1',
    days: '7', bottleSize: '100', showRecipe: false 
  });
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
    const text = (result?.type === 'text' || result?.type === 'peds_card') ? result.rawText : (typeof result === 'string' ? result : `Score: ${result?.score}\n${result?.desc}`);
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
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
      const outputText = `PCA-ohje:\n\nPCA ${dNum} vrk, ${kas} ml kasetti.\n${out}Lääkkeet yhteensä: ${totMl.toFixed(1)} ml\nNaCl 0,9 % ad ${adNum} ml (${(adNum - totMl).toFixed(1)} ml)\n\nPitoisuudet:\n${conc}\nNopeus: ${spdNum} ml/h\nBolus: ${bolus} ml (2x tuntiannos), 20 min lukitus.\n\nJos boluksia menee yli 6/8–24 h, nosta nopeutta +0.1 ml/h ad ${(spdNum + 0.2).toFixed(1)} ml/h ja bolusta +0.2 ml ad ${(parseFloat(bolus) + 0.4).toFixed(1)} ml.\nJos potilas sedatoituu liikaa, vähennä nopeutta –0.1 ml/h.`;
      setResult({ type: 'text', rawText: outputText });
    }

    if (activeTab === 'peds') {
      const w = parseFloat(peds.weight), dMgKg = parseFloat(peds.doseMgKg), s = parseFloat(peds.strength), times = parseInt(peds.timesPerDay) || 1;
      if (!w || !dMgKg || !s) return alert("Täytä kaikki kentät");
      const dailyMg = w * dMgKg, dailyMl = dailyMg / s, singleMg = dailyMg / times, singleMl = dailyMl / times;
      let rawText = `PEDIATRINEN ANNOS:\nPaino: ${w}kg, Annos: ${dMgKg}mg/kg/vrk\nKerta-annos: ${singleMl.toFixed(2)} ml (${singleMg.toFixed(2)} mg)`;
      let recipeData = null;
      if (peds.showRecipe) {
        const courseDays = parseInt(peds.days) || 1, bSize = parseFloat(peds.bottleSize) || 100;
        const totalMl = dailyMl * courseDays;
        recipeData = { courseDays, totalMl: totalMl.toFixed(1), bSize, bottles: Math.ceil(totalMl / bSize) };
        rawText += `\nKuuri: ${courseDays} pv, Yhteensä: ${totalMl.toFixed(1)} ml`;
      }
      setResult({ type: 'peds_card', data: { w, dMgKg, s, times, dailyMg, dailyMl, singleMg, singleMl, recipeData }, rawText });
    }

    if (activeTab === 'chads') {
      let score = chads.chf + chads.ht + chads.age + chads.dm + chads.stroke + chads.vasc;
      if (chads.sex === 1 && score > 0) score += 1;
      const risks = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 12.5, 15.2], strokeRisk = risks[score] || 15.2;
      const hbScore = Object.values(hasbled).reduce((a, b) => a + b, 0);
      setResult({ type: 'dual', score, hbScore, desc: `Aivoinfarktiriski: ${strokeRisk}% / vuosi.\nHAS-BLED: ${hbScore} p.` });
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
    <div className="max-w-[1200px] mx-auto space-y-4 pb-10 text-slate-900 p-2 sm:p-4">
      {/* TABS */}
      <div className="flex bg-white p-1 rounded-2xl border shadow-sm overflow-x-auto no-scrollbar gap-1">
        {[
          { id: 'pca', label: 'PCA', icon: <Zap size={14}/> },
          { id: 'chads', label: 'CHADS', icon: <Heart size={14}/> },
          { id: 'peds', label: 'PEDS', icon: <Baby size={14}/> },
          { id: 'bmi', label: 'BMI', icon: <Activity size={14}/> },
          { id: 'gfr', label: 'GFR', icon: <Calculator size={14}/> }
        ].map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setResult(null); }}
            className={`flex-1 py-3 px-4 rounded-xl text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-2 min-w-[100px] ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border shadow-sm flex flex-col min-h-[600px]">
          <h2 className="text-xl font-black uppercase text-blue-600 tracking-tight mb-6">{activeTab}-Laskuri</h2>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
            
            {activeTab === 'peds' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Paino (kg)</label>
                    <input type="number" value={peds.weight} onChange={e => setPeds({...peds, weight: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:bg-white transition-colors" placeholder="15" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Krt / vrk</label>
                    <input type="number" value={peds.timesPerDay} onChange={e => setPeds({...peds, timesPerDay: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:bg-white transition-colors" placeholder="2" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Annos (mg/kg/vrk)</label>
                  <input type="number" value={peds.doseMgKg} onChange={e => setPeds({...peds, doseMgKg: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:bg-white transition-colors" placeholder="10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Vahvuus (mg/ml)</label>
                  <input type="number" value={peds.strength} onChange={e => setPeds({...peds, strength: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:bg-white transition-colors" placeholder="30" />
                </div>
                
                <label className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 cursor-pointer group hover:bg-blue-50 transition-all">
                  <input type="checkbox" checked={peds.showRecipe} onChange={e => setPeds({...peds, showRecipe: e.target.checked})} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
                  <span className="text-xs font-bold text-blue-700 uppercase">Reseptitiedot</span>
                </label>

                {peds.showRecipe && (
                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-dashed animate-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 ml-1 uppercase">Päivää</label>
                      <input type="number" value={peds.days} onChange={e => setPeds({...peds, days: e.target.value})} className="w-full p-3 bg-white border rounded-xl font-bold text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 ml-1 uppercase">Pullo ml</label>
                      <input type="number" value={peds.bottleSize} onChange={e => setPeds({...peds, bottleSize: e.target.value})} className="w-full p-3 bg-white border rounded-xl font-bold text-sm" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pca' && (
              <div className="space-y-4 animate-in fade-in">
                {selectedDrugs.map((sd, i) => (
                  <div key={i} className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Lääke {i+1} & mg/vrk</label>
                    <div className="flex gap-2">
                      <select className="flex-1 p-4 bg-slate-50 border rounded-2xl text-sm font-bold focus:bg-white transition-colors outline-none" value={sd.name} onChange={e => { const n = [...selectedDrugs]; n[i].name = e.target.value; setSelectedDrugs(n); }}>
                        <option value="none">-- Valitse lääke --</option>
                        {library.map(l => <option key={l.id} value={l.n}>{l.n}</option>)}
                      </select>
                      <input placeholder="mg" className="w-28 p-4 border rounded-2xl text-center font-bold text-sm bg-slate-50 focus:bg-white transition-colors outline-none" value={sd.val} onChange={e => { const n = [...selectedDrugs]; n[i].val = e.target.value; setSelectedDrugs(n); }} />
                    </div>
                  </div>
                ))}
                <button onClick={() => setShowSettings(!showSettings)} className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 hover:text-blue-700 transition-colors">
                  <Settings size={14} /> Asetukset (AD, Pvm, ml)
                </button>
                {showSettings && (
                  <div className="grid grid-cols-4 gap-2 p-4 bg-slate-50 rounded-2xl border animate-in slide-in-from-top-2">
                    {['kas', 'ad', 'spd', 'days'].map(k => (
                      <div key={k}><label className="text-[8px] font-bold uppercase text-slate-400 ml-1">{k}</label>
                      <input value={pca[k as keyof typeof pca]} onChange={e => setPca({...pca, [k]: e.target.value})} className="w-full p-2 border rounded-lg text-xs font-bold" /></div>
                    ))}
                  </div>
                )}
                <div className="mt-6 p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2"><FlaskConical size={12}/> Lisää uusi lääke kantaan</label>
                  <div className="flex gap-1 mb-4">
                    <input placeholder="Nimi" value={newLibDrug.n} onChange={e => setNewLibDrug({...newLibDrug, n:e.target.value})} className="flex-1 p-2.5 border rounded-xl text-xs font-bold bg-white"/>
                    <input placeholder="mg/ml" value={newLibDrug.s} onChange={e => setNewLibDrug({...newLibDrug, s:e.target.value})} className="w-16 p-2.5 border rounded-xl text-xs font-bold bg-white"/>
                    <button onClick={addDrugToLib} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"><Plus size={18}/></button>
                  </div>
                  <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1">
                    {library.map(l => (
                      <div key={l.id} className="flex justify-between p-2.5 bg-white rounded-xl border border-slate-100 items-center shadow-sm">
                        <span className="text-[10px] font-bold">{l.n} <span className="text-slate-400">({l.s} mg/ml)</span></span>
                        <button onClick={() => removeDrugFromLib(l.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bmi' && (
               <div className="space-y-4 animate-in fade-in">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Pituus (cm)</label>
                   <input type="number" value={bmi.h} onChange={e => setBmi({...bmi, h: e.target.value})} className="w-full p-5 bg-slate-50 border rounded-2xl font-black text-lg focus:bg-white" placeholder="175" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Paino (kg)</label>
                   <input type="number" value={bmi.w} onChange={e => setBmi({...bmi, w: e.target.value})} className="w-full p-5 bg-slate-50 border rounded-2xl font-black text-lg focus:bg-white" placeholder="75" />
                 </div>
               </div>
            )}

            {activeTab === 'gfr' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Ikä</label>
                    <input type="number" value={gfr.age} onChange={e => setGfr({...gfr, age: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:bg-white" placeholder="65" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Paino (kg)</label>
                    <input type="number" value={gfr.w} onChange={e => setGfr({...gfr, w: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:bg-white" placeholder="75" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Kreatiniini (µmol/l)</label>
                  <input type="number" value={gfr.creat} onChange={e => setGfr({...gfr, creat: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:bg-white" placeholder="100" />
                </div>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button onClick={() => setGfr({...gfr, sex: '1.23'})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${gfr.sex === '1.23' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Mies</button>
                  <button onClick={() => setGfr({...gfr, sex: '1.04'})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${gfr.sex === '1.04' ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500'}`}>Nainen</button>
                </div>
              </div>
            )}

            {activeTab === 'chads' && (
              <div className="space-y-4 animate-in fade-in">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2">CHADS-VASc kriteerit</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {[{l:"Sydämen vajaatoiminta",k:'chf',v:1},{l:"Hypertensio",k:'ht',v:1},{l:"Ikä ≥ 75",k:'age',v:2},{l:"Ikä 65-74",k:'age',v:1},{l:"Diabetes",k:'dm',v:1},{l:"Aivoinfarkti/TIA",k:'stroke',v:2},{l:"Valtimosairaus",k:'vasc',v:1},{l:"Nainen",k:'sex',v:1}].map(i => (
                    <button key={i.l} onClick={() => setChads({...chads, [i.k]: chads[i.k as keyof typeof chads] === i.v ? 0 : i.v})} className={`p-3 text-left rounded-xl border text-[11px] font-bold transition-all ${chads[i.k as keyof typeof chads] === i.v ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100'}`}>{i.l}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={executeCalculation} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all mt-6">
            Laske / Muodosta
          </button>
        </div>

        {/* RIGHT PANEL (RESULTS) */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm flex flex-col border border-slate-200 min-h-[600px]">
          <div className="flex justify-between items-center mb-6">
             <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
               <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div> Tulos
             </p>
             {result && (
               <button onClick={handleCopy} className={`px-4 py-2 rounded-xl font-bold text-[10px] transition-all flex items-center gap-2 shadow-sm ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                 {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'KOPIOITU' : 'KOPIOI'}
               </button>
             )}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {result ? (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                {/* PCA: CLEAN TEXT VIEW */}
                {result.type === 'text' && (
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800 font-medium">
                      {result.rawText}
                    </pre>
                  </div>
                )}

                {/* PEDS: STRUCTURED CARDS */}
                {result.type === 'peds_card' && (
                  <div className="space-y-4">
                    <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                      <p className="text-[10px] font-bold uppercase opacity-70 mb-2 tracking-widest">Kerta-annos</p>
                      <div className="text-6xl font-black mb-1">{result.data.singleMl.toFixed(2)} <span className="text-2xl">ml</span></div>
                      <p className="text-sm font-bold border-t border-white/20 pt-3 mt-3">Vastaa: {result.data.singleMg.toFixed(2)} mg (x{result.data.times}/vrk)</p>
                      <Baby className="absolute -bottom-4 -right-4 size-32 text-white/10" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Vuorokausi</p>
                        <p className="text-xl font-black text-slate-900">{result.data.dailyMl.toFixed(1)} ml</p>
                        <p className="text-[10px] text-slate-500 font-bold">{result.data.dailyMg.toFixed(1)} mg</p>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Potilas</p>
                        <p className="text-xl font-black text-slate-900">{result.data.w} kg</p>
                        <p className="text-[10px] text-slate-500 font-bold">{result.data.dMgKg} mg/kg</p>
                      </div>
                    </div>
                    {result.data.recipeData && (
                      <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                        <p className="text-[10px] font-black text-amber-600 uppercase mb-3 tracking-widest">Resepti ({result.data.recipeData.courseDays} vrk)</p>
                        <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-amber-200 shadow-sm">
                          <div>
                            <span className="text-lg font-black text-slate-800">{result.data.recipeData.bottles} pulloa</span>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{result.data.recipeData.bSize} ml pakkaus</p>
                          </div>
                          <span className="text-xs font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">Yht: {result.data.recipeData.totalMl} ml</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* BMI/GFR/CHADS */}
                {result.type === 'single' && (
                  <div className="text-center bg-slate-50 p-12 rounded-[3rem] border border-slate-100 shadow-inner">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Scale className="text-blue-600" />
                    </div>
                    <div className="text-8xl font-black text-blue-600 tracking-tighter mb-2">{result.score}</div>
                    <p className="px-6 py-2 bg-blue-600 text-white inline-block rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100">{result.desc}</p>
                  </div>
                )}
                {result.type === 'dual' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-8 rounded-[2rem] border text-center shadow-inner">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">CHADS-VASc</p>
                        <div className="text-6xl font-black text-blue-600">{result.score}</div>
                      </div>
                      <div className={`p-8 rounded-[2rem] border text-center shadow-inner ${result.hbScore >= 3 ? 'bg-red-50 border-red-100' : 'bg-slate-50'}`}>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">HAS-BLED</p>
                        <div className={`text-6xl font-black ${result.hbScore >= 3 ? 'text-red-500' : 'text-blue-600'}`}>{result.hbScore}</div>
                      </div>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-[2rem] text-center text-white text-[11px] font-bold uppercase tracking-wide leading-relaxed">
                      {result.desc}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-200 py-20">
                <Calculator size={64} strokeWidth={1} />
                <p className="text-[10px] font-black uppercase tracking-widest mt-4">Valitse työkalu ja syötä arvot</p>
              </div>
            )}
          </div>
          
          <div className="mt-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3 italic">
            <Info size={16} className="text-blue-400 shrink-0 mt-1" />
            <p className="text-[10px] text-blue-800 leading-normal font-medium">
              Tarkista tulos aina ennen kliinistä käyttöä paikallisten hoito-ohjeiden mukaisesti.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
