"use client";
import { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, Settings, Plus, Trash2, Copy, Check, Zap, Heart, Activity, Baby, 
  FlaskConical, ClipboardList, Info, AlertTriangle, Scale, Stethoscope, Wind, ShieldAlert,
  RefreshCw, Package, CheckCircle2
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
  
  // НОВАЯ ВЕРСИЯ PEDS (Реактивная)
  const [peds, setPeds] = useState({ 
    weight: '', doseMgKg: '', strength: '', timesPerDay: 1,
    days: '', bottleSize: ''
  });

  const [chads, setChads] = useState({ chf: 0, ht: 0, age: 0, dm: 0, stroke: 0, vasc: 0, sex: 0 });
  const [hasbled, setHasbled] = useState({ sbp: 0, renal: 0, liver: 0, stroke: 0, bleed: 0, inr: 0, age: 0, drugs: 0, alc: 0 });
  const [vte, setVte] = useState<Record<string, number>>({});
  const [pe, setPe] = useState<Record<string, number>>({ age: 65 });
  const [cad, setCad] = useState({
    ageRange: '50-59', sex: 'male', symptoms: 'typical',
    factors: { family: false, smoking: false, dyslipidemia: false, diabetes: false, hypertension: false }
  });

  // --- РЕАКТИВНЫЙ РАСЧЕТ PEDS ---
  const pedsResult = useMemo(() => {
    const w = parseFloat(peds.weight) || 0;
    const d = parseFloat(peds.doseMgKg) || 0;
    const days = parseFloat(peds.days) || 0;
    const s = parseFloat(peds.strength) || 0;
    const t = peds.timesPerDay || 1;
    const b = parseFloat(peds.bottleSize) || 0;

    const dailyMg = w * d;
    const totalMg = dailyMg * days;
    const totalMl = s > 0 ? totalMg / s : 0;
    const singleMg = t > 0 ? dailyMg / t : 0;
    const singleMl = s > 0 ? singleMg / s : 0;
    const bottles = b > 0 ? Math.ceil(totalMl / b) : 0;

    return { dailyMg, totalMg, totalMl, singleMg, singleMl, bottles };
  }, [peds]);

  // --- ЛОГИКА БИБЛИОТЕКИ PCA ---
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
    let text = "";
    if (activeTab === 'peds') {
      text = `ANNOSTUSOHJE\nPaino: ${peds.weight}kg\nAnnos: ${peds.doseMgKg}mg/kg/vrk\nKerta-annos: ${pedsResult.singleMl.toFixed(2)}ml (${pedsResult.singleMg.toFixed(1)}mg) x ${peds.timesPerDay}\nKesto: ${peds.days}pv\nKokonais: ${pedsResult.totalMl.toFixed(1)}ml\nResepti: ${pedsResult.bottles} pulloa (${peds.bottleSize}ml)`;
    } else {
      text = (result?.type === 'text' || result?.type === 'cad_result' || result?.type === 'vte_pe_result') 
        ? result.rawText 
        : (typeof result === 'string' ? result : `Score: ${result?.score}\n${result?.desc}`);
    }

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
      const outputText = `PCA-ohje:\n\nPCA ${dNum} vrk, ${kas} ml kasetti.\n${out}Lääkkeet yhteensä: ${totMl.toFixed(1)} ml\nNaCl 0,9 % ad ${adNum} ml (${(adNum - totMl).toFixed(1)} ml)\n\nPitoisuudet:\n${conc}\nNopeus: ${spdNum} ml/h\nBolus: ${bolus} ml (2x tuntiannos), 20 min lukitus.\n\nJos boluksia menee yli 6/8–24 h, nosta nopeutta +0.1 ml/h ad ${(spdNum + 0.2).toFixed(1)} ml/h ja bolusta +0.2 ml ad ${(parseFloat(bolus) + 0.4).toFixed(1)} ml.\nJos potilas sedatoituu liikaa, vähennä nopeutта –0.1 ml/h.`;
      setResult({ type: 'text', rawText: outputText });
    }

    if (activeTab === 'vte') {
      const score = Object.values(vte).reduce((a, b) => a + b, 0);
      let risk = "Pieni", prob = "~3%", rec = "Tutki D-dimeeri. Jos < 0.5 mg/l, ТГВ epätodennäköinen.";
      if (score >= 3) { risk = "Suuri"; prob = "~75%"; rec = "Suoraan ultraäänitutkimukseen (UÄ)."; }
      else if (score >= 1) { risk = "Kohtalainen"; prob = "~17%"; rec = "Tutki D-dimeeri. Jos koholla, etene UÄ:hyn."; }
      setResult({ type: 'vte_pe_result', score, risk, prob, rec, title: "ТГВ (VTE) Riski", rawText: `VTE Score: ${score}\nRiski: ${risk}\nSuositus: ${rec}` });
    }

    if (activeTab === 'pe') {
      const currentScore = Object.entries(pe).filter(([k]) => k !== 'age').reduce((a, [_,v]) => a + (v as number), 0);
      let risk = "Pieni", prob = "~2%", rec = "";
      const age = pe.age || 50;
      const dThreshold = age > 50 ? (age / 100).toFixed(1) : "0.5";
      if (currentScore > 6) { risk = "Suuri"; prob = "~50%"; rec = "TT-angiografiaan heti."; }
      else if (currentScore >= 2) { risk = "Kohtalainen"; rec = `D-dimeeri (raja: ${dThreshold}). Jos yli, TT-angio.`; }
      else { rec = "D-dimeeri. Jos < 1.0, PE poissuljettu."; }
      setResult({ type: 'vte_pe_result', score: currentScore, risk, prob, rec, title: "ТЭЛА (PE) Riski", rawText: `PE Score: ${currentScore}\nRiski: ${risk}\nSuositus: ${rec}` });
    }

    if (activeTab === 'chads') {
      let score = chads.chf + chads.ht + chads.age + chads.dm + chads.stroke + chads.vasc;
      if (chads.sex === 1 && score > 0) score += 1;
      const risks = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 12.5, 15.2];
      const strokeRisk = risks[score] || 15.2;
      const hbScore = Object.values(hasbled).reduce((a, b) => a + b, 0);
      setResult({ type: 'dual', score, hbScore, desc: `Aivoinfarktiriski: ${strokeRisk}%/v. HAS-BLED: ${hbScore} p.` });
    }

    if (activeTab === 'bmi') {
      const h = parseFloat(bmi.h) / 100, w = parseFloat(bmi.w);
      if (h && w) setResult({ type: 'single', score: (w / (h * h)).toFixed(1), desc: "Painoindeksi" });
    }

    if (activeTab === 'gfr') {
      const score = Math.round(((140 - +gfr.age) * +gfr.w * +gfr.sex) / +gfr.creat);
      setResult({ type: 'single', score, desc: "ml/min (Cockcroft-Gault)" });
    }

    if (activeTab === 'cad') {
      const factorCount = Object.values(cad.factors).filter(v => v === true).length;
      let factorKey = factorCount >= 4 ? '4-5' : (factorCount >= 2 ? '2-3' : '0-1');
      const cadMatrix: any = {
        'male': {
          'typical': { '30-39': {'0-1': 9, '2-3': 14, '4-5': 22}, '40-49': {'0-1': 14, '2-3': 20, '4-5': 27}, '50-59': {'0-1': 21, '2-3': 27, '4-5': 33}, '60-69': {'0-1': 32, '2-3': 35, '4-5': 39}, '70-80': {'0-1': 44, '2-3': 44, '4-5': 45} },
          'atypical': { '30-39': {'0-1': 2, '2-3': 4, '4-5': 8}, '40-49': {'0-1': 3, '2-3': 6, '4-5': 12}, '50-59': {'0-1': 6, '2-3': 11, '4-5': 17}, '60-69': {'0-1': 12, '2-3': 17, '4-5': 25}, '70-80': {'0-1': 22, '2-3': 27, '4-5': 34} },
          'other': { '30-39': {'0-1': 1, '2-3': 2, '4-5': 5}, '40-49': {'0-1': 2, '2-3': 4, '4-5': 8}, '50-59': {'0-1': 4, '2-3': 7, '4-5': 12}, '60-69': {'0-1': 8, '2-3': 12, '4-5': 17}, '70-80': {'0-1': 15, '2-3': 19, '4-5': 24} }
        },
        'female': {
          'typical': { '30-39': {'0-1': 2, '2-3': 5, '4-5': 10}, '40-49': {'0-1': 4, '2-3': 7, '4-5': 12}, '50-59': {'0-1': 6, '2-3': 10, '4-5': 15}, '60-69': {'0-1': 10, '2-3': 14, '4-5': 19}, '70-80': {'0-1': 16, '2-3': 19, '4-5': 23} },
          'atypical': { '30-39': {'0-1': 0, '2-3': 1, '4-5': 3}, '40-49': {'0-1': 1, '2-3': 2, '4-5': 5}, '50-59': {'0-1': 2, '2-3': 3, '4-5': 7}, '60-69': {'0-1': 3, '2-3': 6, '4-5': 11}, '70-80': {'0-1': 6, '2-3': 10, '4-5': 16} },
          'other': { '30-39': {'0-1': 0, '2-3': 1, '4-5': 2}, '40-49': {'0-1': 1, '2-3': 1, '4-5': 3}, '50-59': {'0-1': 1, '2-3': 2, '4-5': 5}, '60-69': {'0-1': 2, '2-3': 4, '4-5': 7}, '70-80': {'0-1': 2, '2-3': 7, '4-5': 11} }
        }
      };
      const prob = cadMatrix[cad.sex][cad.symptoms][cad.ageRange][factorKey];
      setResult({ type: 'cad_result', prob, color: prob <= 15 ? 'blue' : 'amber', factorCount, rawText: `CAD Prob: ${prob}%` });
    }
  };

  const resetPeds = () => {
    setPeds({ weight: '', doseMgKg: '', strength: '', timesPerDay: 1, days: '', bottleSize: '' });
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 pb-10 text-slate-900 p-2 sm:p-4">
      {/* TABS NAVIGATION */}
      <div className="flex bg-white p-1 rounded-2xl border shadow-sm overflow-x-auto no-scrollbar gap-1">
        {[
          { id: 'pca', label: 'PCA', icon: <Zap size={14}/> },
          { id: 'vte', label: 'VTE (ТГВ)', icon: <ShieldAlert size={14}/> },
          { id: 'pe', label: 'PE (ТЭЛА)', icon: <Wind size={14}/> },
          { id: 'cad', label: 'CAD Risk', icon: <Stethoscope size={14}/> },
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
        
        {/* LEFT PANEL: INPUTS */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border shadow-sm flex flex-col min-h-[600px]">
          <h2 className="text-xl font-black uppercase text-blue-600 tracking-tight mb-6">{activeTab}-Laskuri</h2>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pr-1">
            
            {/* --- PEDS (NEW) --- */}
            {activeTab === 'peds' && (
              <div className="space-y-5 animate-in fade-in">
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Paino (kg)</label>
                    <input type="number" value={peds.weight} onChange={e => setPeds({...peds, weight: e.target.value})} className="w-full p-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Annos (mg/kg/vrk)</label>
                    <input type="number" value={peds.doseMgKg} onChange={e => setPeds({...peds, doseMgKg: e.target.value})} className="w-full p-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Kuurin kesto (päivää)</label>
                  <input type="number" value={peds.days} onChange={e => setPeds({...peds, days: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Vahvuus (mg / ml)</label>
                  <input type="number" value={peds.strength} onChange={e => setPeds({...peds, strength: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Antokerrat (vrk)</label>
                  <div className="grid grid-cols-6 gap-2">
                    {[1,2,3,4,5,6].map(n => (
                      <button key={n} onClick={() => setPeds({...peds, timesPerDay: n})} 
                        className={`py-3 rounded-xl font-black text-xs transition-all border ${peds.timesPerDay === n ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'}`}>
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Pullon koko (ml)</label>
                  <input type="number" value={peds.bottleSize} onChange={e => setPeds({...peds, bottleSize: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none transition-all" />
                </div>
                <button onClick={resetPeds} className="w-full mt-2 py-4 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                  <RefreshCw size={14}/> Tyhjennä lomake
                </button>
              </div>
            )}

            {/* --- PCA --- */}
            {activeTab === 'pca' && (
              <div className="space-y-4 animate-in fade-in">
                {selectedDrugs.map((sd, i) => (
                  <div key={i} className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-widest">Lääke {i+1}</label>
                    <div className="flex gap-2">
                      <select className="flex-1 p-4 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" value={sd.name} onChange={e => { const n = [...selectedDrugs]; n[i].name = e.target.value; setSelectedDrugs(n); }}>
                        <option value="none">-- Valitse lääke --</option>
                        {library.map(l => <option key={l.id} value={l.n}>{l.n}</option>)}
                      </select>
                      <input placeholder="mg" className="w-24 p-4 border rounded-2xl text-center font-bold bg-slate-50 outline-none" value={sd.val} onChange={e => { const n = [...selectedDrugs]; n[i].val = e.target.value; setSelectedDrugs(n); }} />
                    </div>
                  </div>
                ))}
                <button onClick={() => setShowSettings(!showSettings)} className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1"><Settings size={14} /> Asetukset (AD, Pvm, ml)</button>
                {showSettings && (
                  <div className="grid grid-cols-4 gap-2 p-4 bg-slate-50 rounded-2xl border animate-in slide-in-from-top-2">
                    {['kas', 'ad', 'spd', 'days'].map(k => (
                      <div key={k}><label className="text-[8px] font-bold uppercase text-slate-400 ml-1">{k}</label>
                      <input value={(pca as any)[k]} onChange={e => setPca({...pca, [k]: e.target.value})} className="w-full p-2 border rounded-lg text-xs font-bold outline-none" /></div>
                    ))}
                  </div>
                )}
                <div className="mt-6 p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-widest"><FlaskConical size={12}/> Lääkekirjasto</label>
                  <div className="flex gap-1 mb-4">
                    <input placeholder="Nimi" value={newLibDrug.n} onChange={e => setNewLibDrug({...newLibDrug, n:e.target.value})} className="flex-1 p-2.5 border rounded-xl text-xs font-bold bg-white outline-none"/>
                    <input placeholder="mg/ml" value={newLibDrug.s} onChange={e => setNewLibDrug({...newLibDrug, s:e.target.value})} className="w-16 p-2.5 border rounded-xl text-xs font-bold bg-white outline-none"/>
                    <button onClick={addDrugToLib} className="p-2.5 bg-blue-600 text-white rounded-xl active:scale-95 transition-all"><Plus size={18}/></button>
                  </div>
                  <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1">
                    {library.map(l => (
                      <div key={l.id} className="flex justify-between p-2.5 bg-white rounded-xl border border-slate-100 items-center shadow-sm">
                        <span className="text-[10px] font-bold">{l.n} <span className="text-slate-400 font-normal">({l.s} mg/ml)</span></span>
                        <button onClick={() => removeDrugFromLib(l.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- VTE --- */}
            {activeTab === 'vte' && (
              <div className="space-y-2 animate-in fade-in">
                {[
                  {l: "Aktiivinen syöpä", k: "cancer", v: 1}, {l: "Paralyysi / kipsaus", k: "immob", v: 1},
                  {l: "Vuodelepo >3pv / leikkaus <4vk", k: "bed", v: 1}, {l: "Paikallinen palpaatioarkuus", k: "tend", v: 1},
                  {l: "Koko alaraajan turvotus", k: "whole", v: 1}, {l: "Säären ympärismitta >3cm ero", k: "calf", v: 1},
                  {l: "Pitting-turvotus", k: "pitt", v: 1}, {l: "Näkyvät pinnalliset laskimot", k: "veins", v: 1},
                  {l: "Aiempi diagnosoitu ТГВ", k: "prev", v: 1}, {l: "Muu dg todennäköisempi", k: "alt", v: -2},
                ].map(item => (
                  <button key={item.k} onClick={() => setVte({...vte, [item.k]: vte[item.k] ? 0 : item.v})} className={`w-full p-3 text-left rounded-xl border text-[11px] font-bold flex justify-between items-center transition-all ${vte[item.k] ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50'}`}>
                    {item.l} {vte[item.k] !== undefined && vte[item.k] !== 0 && <Check size={14}/>}
                  </button>
                ))}
              </div>
            )}

            {/* --- PE --- */}
            {activeTab === 'pe' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Potilaan ikä</label>
                    <input type="number" value={pe.age} onChange={e => setPe({...pe, age: parseInt(e.target.value)})} className="w-full p-3 bg-slate-50 border rounded-2xl font-bold outline-none" />
                </div>
                <div className="space-y-2">
                {[
                  {l: "ТГВ oireet", k: "vtesigns", v: 3.0}, {l: "Muu dg epätodennäköisempi", k: "altpe", v: 3.0},
                  {l: "Syke > 100/min", k: "hr", v: 1.5}, {l: "Immobilisaatio/leikkaus", k: "immobpe", v: 1.5},
                  {l: "Aiempi ТГВ/PE", k: "prevpe", v: 1.5}, {l: "Veriyskä", k: "hemopt", v: 1.0},
                  {l: "Aktiivinen syöpä", k: "cancerpe", v: 1.0},
                ].map(item => (
                  <button key={item.k} onClick={() => setPe({...pe, [item.k]: pe[item.k] ? 0 : item.v})} className={`w-full p-3 text-left rounded-xl border text-[11px] font-bold flex justify-between items-center transition-all ${pe[item.k] ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50'}`}>
                    {item.l} <span className="opacity-60">+{item.v}</span>
                  </button>
                ))}
                </div>
              </div>
            )}

            {/* --- CAD --- */}
            {activeTab === 'cad' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Sukupuoli</label>
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                    <button onClick={() => setCad({...cad, sex: 'male'})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${cad.sex === 'male' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Mies</button>
                    <button onClick={() => setCad({...cad, sex: 'female'})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${cad.sex === 'female' ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500'}`}>Nainen</button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Ikä</label>
                  <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none" value={cad.ageRange} onChange={e => setCad({...cad, ageRange: e.target.value})}>
                    {['30-39', '40-49', '50-59', '60-69', '70-80'].map(range => <option key={range} value={range}>{range} vuotta</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-widest">Kivun tyyppi</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[{id: 'typical', l: 'Tyypillinen rintakipu'}, {id: 'atypical', l: 'Epätyypillinen'}, {id: 'other', l: 'Muu kipu'}].map(s => (
                      <button key={s.id} onClick={() => setCad({...cad, symptoms: s.id})} className={`p-4 text-left rounded-xl border text-[11px] font-bold transition-all ${cad.symptoms === s.id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100'}`}>
                        {s.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-widest">Riskitekijät</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[{id: 'family', l: 'Sukurasiate'}, {id: 'smoking', l: 'Tupakointi'}, {id: 'dyslipidemia', l: 'Dyslipidemia'}, {id: 'diabetes', l: 'Diabetes'}, {id: 'hypertension', l: 'Verenpainetauti'}].map(f => (
                      <button key={f.id} onClick={() => toggleFactor(f.id)} className={`p-3 text-left rounded-xl border text-[11px] font-bold transition-all flex items-center justify-between ${cad.factors[f.id as keyof typeof cad.factors] ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100'}`}>
                        {f.l} {cad.factors[f.id as keyof typeof cad.factors] && <Check size={14}/>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- CHADS / HAS-BLED --- */}
            {activeTab === 'chads' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-2">CHADS-VASc</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[{l:"Vajaatoiminta",k:'chf',v:1},{l:"Hypertensio",k:'ht',v:1},{l:"Ikä ≥ 75",k:'age',v:2},{l:"Ikä 65-74",k:'age',v:1},{l:"Diabetes",k:'dm',v:1},{l:"TIA/Infarkti",k:'stroke',v:2},{l:"Valtimotauti",k:'vasc',v:1},{l:"Nainen",k:'sex',v:1}].map(i => (
                      <button key={i.l} onClick={() => setChads({...chads, [i.k]: (chads as any)[i.k] === i.v ? 0 : i.v})} className={`p-3 text-left rounded-xl border text-[11px] font-bold transition-all ${(chads as any)[i.k] === i.v ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50'}`}>{i.l}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">HAS-BLED</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[{l:"RR-syst. > 160",k:'sbp',v:1},{l:"Munuais-vajaat.",k:'renal',v:1},{l:"Maksa-vajaat.",k:'liver',v:1},{l:"Aiempi vuoto",k:'bleed',v:1},{l:"Labiili INR",k:'inr',v:1},{l:"Ikä > 65",k:'age',v:1},{l:"Lääkitys",k:'drugs',v:1},{l:"Alkoholi",k:'alc',v:1}].map(i => (
                      <button key={i.l} onClick={() => setHasbled({...hasbled, [i.k]: (hasbled as any)[i.k] === i.v ? 0 : i.v})} className={`p-3 text-left rounded-xl border text-[11px] font-bold transition-all ${(hasbled as any)[i.k] === i.v ? 'bg-red-600 text-white shadow-md' : 'bg-red-50/50 text-red-700'}`}>{i.l}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- BMI --- */}
            {activeTab === 'bmi' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Pituus (cm)</label>
                  <input type="number" value={bmi.h} onChange={e => setBmi({...bmi, h: e.target.value})} className="w-full p-5 bg-slate-50 border rounded-2xl font-black text-lg focus:bg-white outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Paino (kg)</label>
                  <input type="number" value={bmi.w} onChange={e => setBmi({...bmi, w: e.target.value})} className="w-full p-5 bg-slate-50 border rounded-2xl font-black text-lg focus:bg-white outline-none" />
                </div>
              </div>
            )}

            {/* --- GFR --- */}
            {activeTab === 'gfr' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Ikä</label>
                    <input type="number" value={gfr.age} onChange={e => setGfr({...gfr, age: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:bg-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Paino (kg)</label>
                    <input type="number" value={gfr.w} onChange={e => setGfr({...gfr, w: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:bg-white outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Kreatiniini (µmol/l)</label>
                  <input type="number" value={gfr.creat} onChange={e => setGfr({...gfr, creat: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:bg-white outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-widest">Sukupuoli</label>
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                    <button onClick={() => setGfr({...gfr, sex: '1.23'})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${gfr.sex === '1.23' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Mies</button>
                    <button onClick={() => setGfr({...gfr, sex: '1.04'})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${gfr.sex === '1.04' ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500'}`}>Nainen</button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* GENERATE BUTTON (Except for PEDS which is live) */}
          {activeTab !== 'peds' && (
            <button onClick={executeCalculation} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-[0.98] transition-all mt-6 shadow-blue-100">
              Laske / Muodosta
            </button>
          )}
        </div>

        {/* RIGHT PANEL: RESULTS */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-sm flex flex-col border border-slate-200 min-h-[600px]">
          <div className="flex justify-between items-center mb-6">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div> 
              {activeTab === 'peds' ? 'Laskelmat' : 'Tulos'}
            </p>
            {(result || (activeTab === 'peds' && pedsResult.dailyMg > 0)) && (
              <button onClick={handleCopy} className={`px-4 py-2 rounded-xl font-bold text-[10px] transition-all flex items-center gap-2 shadow-sm ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'KOPIOITU' : 'KOPIOI'}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            
            {/* PEDS LIVE RESULTS */}
            {activeTab === 'peds' ? (
              <div className="space-y-6 animate-in fade-in">
                {pedsResult.dailyMg > 0 && (
                  <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 animate-in slide-in-from-left-4">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">1. Vuorokausiannos (mg)</p>
                    <div className="flex items-baseline gap-2 text-slate-700">
                        <span className="text-3xl font-black">{pedsResult.dailyMg.toFixed(1)}</span>
                        <span className="text-sm font-bold opacity-50">mg / vrk</span>
                    </div>
                  </div>
                )}
                {pedsResult.totalMg > 0 && (
                  <div className="p-5 bg-white rounded-3xl border border-slate-200 animate-in slide-in-from-left-4">
                    <p className="text-[9px] font-bold text-slate-300 uppercase mb-1 tracking-widest">2. Koko kuurin tarve (mg)</p>
                    <div className="flex items-baseline gap-2 text-slate-400">
                        <span className="text-2xl font-bold">{pedsResult.totalMg.toFixed(0)}</span>
                        <span className="text-sm font-medium opacity-60">mg yhteensä</span>
                    </div>
                  </div>
                )}
                {pedsResult.totalMl > 0 && (
                  <div className="p-7 bg-blue-600 rounded-[2.5rem] text-white shadow-2xl shadow-blue-200 border-4 border-blue-500 animate-in zoom-in-95">
                    <p className="text-[10px] font-black uppercase opacity-70 mb-2 tracking-widest">3. Tarvittava tilavuus (ml)</p>
                    <div className="flex items-baseline gap-3">
                        <span className="text-6xl font-black">{pedsResult.totalMl.toFixed(1)}</span>
                        <span className="text-2xl font-bold opacity-80">ml</span>
                    </div>
                    <p className="text-[9px] font-bold opacity-60 mt-3 uppercase tracking-tighter italic">Määrätään reseptiin koko kuurille</p>
                  </div>
                )}
                {pedsResult.singleMl > 0 && (
                  <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex justify-between items-center shadow-sm animate-in slide-in-from-bottom-4">
                    <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Kerta-annos (ml)</p>
                        <div className="text-4xl font-black text-emerald-700">{pedsResult.singleMl.toFixed(2)} <span className="text-xl">ml</span></div>
                    </div>
                    <div className="text-right">
                        <div className="text-md font-bold text-emerald-500">{pedsResult.singleMg.toFixed(1)} mg</div>
                        <div className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">{peds.timesPerDay} krt / vrk</div>
                    </div>
                  </div>
                )}
                {pedsResult.bottles > 0 && (
                  <div className="flex items-center gap-5 p-6 bg-slate-800 rounded-3xl text-white animate-in zoom-in-95">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-slate-400"><Package size={24}/></div>
                    <div>
                        <p className="text-[9px] font-bold uppercase opacity-40 tracking-widest">Resepti</p>
                        <div className="text-xl font-black">{pedsResult.bottles} pulloa</div>
                        <p className="text-[9px] opacity-30 tracking-tight">à {peds.bottleSize} ml pullo</p>
                    </div>
                  </div>
                )}
                {pedsResult.dailyMg === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-200 py-20">
                    <Baby size={64} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-widest mt-4 italic">Syötä paino ja annos</p>
                  </div>
                )}
              </div>
            ) : (
              result && (
                <div className="animate-in fade-in duration-200 space-y-6">
                  {result.type === 'vte_pe_result' && (
                    <div className="space-y-6">
                      <div className={`p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden ${result.risk === 'Pieni' ? 'bg-emerald-500' : (result.risk === 'Suuri' ? 'bg-red-500' : 'bg-amber-500')}`}>
                        <p className="text-[10px] font-bold uppercase opacity-80 mb-2 tracking-widest text-center">{result.title}</p>
                        <div className="text-8xl font-black text-center">{result.score}</div>
                        <p className="text-center text-[10px] font-bold uppercase tracking-wider bg-black/10 py-2 rounded-full mt-4">{result.risk} TODENNÄKÖISYYS ({result.prob})</p>
                      </div>
                      <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 mb-2 uppercase">Suositus</p>
                        <p className="text-slate-800 font-bold leading-relaxed text-lg italic">"{result.rec}"</p>
                      </div>
                    </div>
                  )}

                  {result.type === 'cad_result' && (
                    <div className="space-y-6">
                      <div className={`p-8 rounded-[3rem] text-white shadow-xl ${result.color === 'blue' ? 'bg-blue-500 shadow-blue-100' : 'bg-amber-500 shadow-amber-100'}`}>
                        <p className="text-[10px] font-bold uppercase opacity-80 mb-2 tracking-widest text-center tracking-[0.2em]">Ennakkotodennäköisyys</p>
                        <div className="text-8xl font-black text-center mb-2">{result.prob}<span className="text-3xl">%</span></div>
                      </div>
                    </div>
                  )}

                  {result.type === 'text' && (
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800 font-medium">{result.rawText}</pre>
                    </div>
                  )}

                  {result.type === 'single' && (
                    <div className="text-center bg-slate-50 p-12 rounded-[3rem] border border-slate-100">
                      <Scale className="mx-auto mb-4 text-blue-600" size={48} />
                      <div className="text-8xl font-black text-blue-600 tracking-tighter mb-2">{result.score}</div>
                      <p className="px-6 py-2 bg-blue-600 text-white inline-block rounded-full text-[10px] font-black uppercase tracking-widest">{result.desc}</p>
                    </div>
                  )}

                  {result.type === 'dual' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-8 rounded-[2rem] border text-center shadow-inner">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">CHADS</p>
                          <div className="text-6xl font-black text-blue-600">{result.score}</div>
                        </div>
                        <div className={`p-8 rounded-[2rem] border text-center shadow-inner ${result.hbScore >= 3 ? 'bg-red-50 border-red-100' : 'bg-slate-50'}`}>
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">HAS-BLED</p>
                          <div className={`text-6xl font-black ${result.hbScore >= 3 ? 'text-red-500' : 'text-blue-600'}`}>{result.hbScore}</div>
                        </div>
                      </div>
                      <div className="bg-slate-900 p-6 rounded-[2rem] text-center text-white text-[11px] font-bold uppercase tracking-wide leading-relaxed shadow-lg">{result.desc}</div>
                    </div>
                  )}
                </div>
              )
            )}

            {!result && activeTab !== 'peds' && (
              <div className="h-full flex flex-col items-center justify-center text-slate-200 py-20">
                <Calculator size={64} strokeWidth={1} />
                <p className="text-[10px] font-black uppercase tracking-widest mt-4 italic">Syötä arvot ja laske</p>
              </div>
            )}
          </div>
          
          <div className="mt-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3 italic">
            <Info size={16} className="text-blue-400 shrink-0 mt-1" />
            <p className="text-[10px] text-blue-800 leading-normal font-medium tracking-tight">
              Tarkista tulos aina ennen kliinistä käyttöä paikallisten hoito-ohjeiden mukaisesti.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
