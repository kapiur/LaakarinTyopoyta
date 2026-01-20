"use client";
import { useState, useEffect } from 'react';
import { 
  Calculator, Settings, Plus, Trash2, Copy, Check, Zap, Heart, Activity, Baby, 
  FlaskConical, Syringe, ClipboardList, Info, AlertTriangle, Scale
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

  // --- ИСПРАВЛЕННАЯ ФУНКЦИЯ КОПИРОВАНИЯ ---
  const handleCopy = () => {
    if (!result) return;

    let textToCopy = "";

    if (result.rawText) {
      // Для PCA и PEDS используем заранее подготовленный текст
      textToCopy = result.rawText;
    } else if (result.type === 'dual') {
      // Для CHADS/HAS-BLED
      textToCopy = `CHADS-VASc: ${result.score}\nHAS-BLED: ${result.hbScore}\n${result.desc}`;
    } else if (result.type === 'single') {
      // Для BMI и GFR
      textToCopy = `Tulos: ${result.score}\nKuvaus: ${result.desc}`;
    } else if (typeof result === 'string') {
      textToCopy = result;
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
        console.error('Kopiointi epäonnistui', err);
      });
    }
  };

  // --- ФУНКЦИИ РАСЧЕТА ---
  const executeCalculation = () => {
    if (activeTab === 'pca') {
      const { kas, ad, spd, days } = pca;
      const adNum = parseFloat(ad), spdNum = parseFloat(spd), dNum = parseInt(days);
      let outList: any[] = [], totMl = 0, concList: any[] = [];
      let rawOut = `PCA-OHJE (${dNum} vrk, ${kas}ml kasetti):\n`;

      selectedDrugs.forEach(drug => {
        const vNum = parseFloat(drug.val);
        if (isNaN(vNum) || vNum <= 0 || drug.name === 'none') return;
        const libData = library.find(l => l.n === drug.name);
        if (!libData) return;
        const mgT = vNum * dNum, ml = mgT / libData.s;
        totMl += ml;
        outList.push({ name: drug.name, mgDay: vNum, mgTotal: mgT.toFixed(1), mlTotal: ml.toFixed(1) });
        const c = (mgT / adNum).toFixed(libData.s < 1 ? 3 : 2);
        concList.push({ name: drug.name.split(' ')[0], conc: c });
        rawOut += `- ${drug.name}: ${vNum} mg/vrk (${mgT.toFixed(1)} mg kokonaismäärä)\n`;
      });
      
      if (outList.length === 0) return;
      const bolus = (spdNum * 2).toFixed(1);
      rawOut += `Nopeus: ${spdNum} ml/h\nBolus: ${bolus} ml\nNaCl 0,9%: ad ${adNum} ml (lisätään ${(adNum - totMl).toFixed(1)} ml)`;
      
      setResult({
        type: 'pca',
        data: { outList, totMl, adNum, spdNum, bolus, dNum, kas, concList },
        rawText: rawOut
      });
    }

    if (activeTab === 'peds') {
      const w = parseFloat(peds.weight);
      const dMgKg = parseFloat(peds.doseMgKg);
      const s = parseFloat(peds.strength);
      const times = parseInt(peds.timesPerDay) || 1;
      if (!w || !dMgKg || !s) return alert("Täytä kaikki kentät");

      const dailyMg = w * dMgKg;
      const dailyMl = dailyMg / s;
      const singleMg = dailyMg / times;
      const singleMl = dailyMl / times;

      let recipe = null;
      let rawText = `PEDIATRINEN ANNOS:\nPaino: ${w} kg\nAnnos: ${dMgKg} mg/kg/vrk\nKerta-annos: ${singleMl.toFixed(2)} ml (${singleMg.toFixed(2)} mg) x ${times}/vrk`;

      if (peds.showRecipe) {
        const courseDays = parseInt(peds.days) || 1;
        const bSize = parseFloat(peds.bottleSize) || 100;
        const totalCourseMl = dailyMl * courseDays;
        const bottles = Math.ceil(totalCourseMl / bSize);
        recipe = { courseDays, totalCourseMl: totalCourseMl.toFixed(1), bSize, bottles };
        rawText += `\nKuuri: ${courseDays} vrk\nYhteensä: ${totalCourseMl.toFixed(1)} ml (${bottles} plo)`;
      }

      setResult({
        type: 'peds_structured',
        data: { w, dMgKg, s, times, dailyMg, dailyMl, singleMg, singleMl, recipe },
        rawText: rawText
      });
    }

    if (activeTab === 'chads') {
      let score = chads.chf + chads.ht + chads.age + chads.dm + chads.stroke + chads.vasc;
      if (chads.sex === 1 && score > 0) score += 1;
      const risks = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 12.5, 15.2];
      const strokeRisk = risks[score] || 15.2;
      const hbScore = Object.values(hasbled).reduce((a, b) => a + b, 0);
      setResult({ type: 'dual', score, hbScore, desc: `Aivoinfarktiriski: ${strokeRisk}% / vuosi. HAS-BLED: ${hbScore} p.` });
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
          <h2 className="text-xl font-black uppercase text-blue-600 tracking-tight mb-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Calculator size={18}/></div>
            {activeTab}-Laskuri
          </h2>
          
          <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
            {activeTab === 'peds' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Paino (kg)</label>
                    <input type="number" value={peds.weight} onChange={e => setPeds({...peds, weight: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold focus:ring-2 ring-blue-100 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Krt / vrk</label>
                    <input type="number" value={peds.timesPerDay} onChange={e => setPeds({...peds, timesPerDay: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Annos (mg/kg/vrk)</label>
                  <input type="number" value={peds.doseMgKg} onChange={e => setPeds({...peds, doseMgKg: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Vahvuus (mg/ml)</label>
                  <input type="number" value={peds.strength} onChange={e => setPeds({...peds, strength: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" />
                </div>
                <label className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors">
                  <input type="checkbox" checked={peds.showRecipe} onChange={e => setPeds({...peds, showRecipe: e.target.checked})} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
                  <span className="text-xs font-bold text-blue-700 uppercase">Reseptisuunnitelma</span>
                </label>
                {peds.showRecipe && (
                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-dashed animate-in slide-in-from-top-2">
                    <input type="number" placeholder="Päivää" value={peds.days} onChange={e => setPeds({...peds, days: e.target.value})} className="p-3 bg-white border rounded-xl font-bold text-sm" />
                    <input type="number" placeholder="Pullo ml" value={peds.bottleSize} onChange={e => setPeds({...peds, bottleSize: e.target.value})} className="p-3 bg-white border rounded-xl font-bold text-sm" />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pca' && (
              <div className="space-y-4 animate-in fade-in">
                {selectedDrugs.map((sd, i) => (
                  <div key={i} className="flex gap-2">
                    <select className="flex-1 p-4 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" value={sd.name} onChange={e => { const n = [...selectedDrugs]; n[i].name = e.target.value; setSelectedDrugs(n); }}>
                      <option value="none">-- Valitse lääke --</option>
                      {library.map(l => <option key={l.id} value={l.n}>{l.n}</option>)}
                    </select>
                    <input placeholder="mg/vrk" className="w-28 p-4 border rounded-2xl text-center font-bold text-sm bg-white shadow-sm" value={sd.val} onChange={e => { const n = [...selectedDrugs]; n[i].val = e.target.value; setSelectedDrugs(n); }} />
                  </div>
                ))}
                
                <div className="flex justify-between items-center py-2">
                  <button onClick={() => setShowSettings(!showSettings)} className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
                    <Settings size={12}/> Asetukset
                  </button>
                </div>

                {showSettings && (
                  <div className="grid grid-cols-4 gap-2 p-4 bg-slate-50 rounded-2xl border animate-in slide-in-from-top-2">
                    {['kas', 'ad', 'spd', 'days'].map(k => (
                      <div key={k}>
                        <label className="text-[8px] font-bold uppercase text-slate-400 ml-1">{k}</label>
                        <input value={pca[k as keyof typeof pca]} onChange={e => setPca({...pca, [k]: e.target.value})} className="w-full p-2 border rounded-lg text-xs font-bold" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <FlaskConical size={12}/> Lääkekirjasto
                  </p>
                  <div className="flex gap-1 mb-4">
                    <input placeholder="Nimi" value={newLibDrug.n} onChange={e => setNewLibDrug({...newLibDrug, n:e.target.value})} className="flex-1 p-2.5 border rounded-xl text-xs font-bold"/>
                    <input placeholder="mg/ml" value={newLibDrug.s} onChange={e => setNewLibDrug({...newLibDrug, s:e.target.value})} className="w-16 p-2.5 border rounded-xl text-xs font-bold"/>
                    <button onClick={addDrugToLib} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"><Plus size={18}/></button>
                  </div>
                  <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1 pr-1">
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

            {activeTab === 'chads' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1 mb-2">CHADS-VASc</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[{l:"Sydämen vajaatoiminta",k:'chf',v:1},{l:"Hypertensio",k:'ht',v:1},{l:"Ikä ≥ 75",k:'age',v:2},{l:"Ikä 65-74",k:'age',v:1},{l:"Diabetes",k:'dm',v:1},{l:"Aivoinfarkti/TIA",k:'stroke',v:2},{l:"Valtimosairaus",k:'vasc',v:1},{l:"Nainen",k:'sex',v:1}].map(i => (
                      <button key={i.l} onClick={() => setChads({...chads, [i.k]: chads[i.k as keyof typeof chads] === i.v ? 0 : i.v})} className={`p-3 text-left rounded-xl border text-[11px] font-bold transition-all ${chads[i.k as keyof typeof chads] === i.v ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>{i.l}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1 mb-2">HAS-BLED</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[{l:"RR-syst. > 160",k:'sbp',v:1},{l:"Munuaisten vajaat.",k:'renal',v:1},{l:"Maksan vajaat.",k:'liver',v:1},{l:"Aiempi vuoto",k:'bleed',v:1},{l:"Labiili INR",k:'inr',v:1},{l:"Ikä > 65",k:'age',v:1},{l:"Lääkitys",k:'drugs',v:1},{l:"Alkoholi",k:'alc',v:1}].map(i => (
                      <button key={i.l} onClick={() => setHasbled({...hasbled, [i.k]: hasbled[i.k as keyof typeof hasbled] === i.v ? 0 : i.v})} className={`p-3 text-left rounded-xl border text-[11px] font-bold transition-all ${hasbled[i.k as keyof typeof hasbled] === i.v ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-red-50/50 hover:bg-red-50 text-red-700'}`}>{i.l}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bmi' && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Pituus (cm)</label>
                  <input type="number" value={bmi.h} onChange={e => setBmi({...bmi, h: e.target.value})} className="w-full p-5 bg-slate-50 border rounded-2xl font-black text-lg outline-none focus:ring-2 ring-blue-100" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-2">Paino (kg)</label>
                  <input type="number" value={bmi.w} onChange={e => setBmi({...bmi, w: e.target.value})} className="w-full p-5 bg-slate-50 border rounded-2xl font-black text-lg outline-none focus:ring-2 ring-blue-100" />
                </div>
              </div>
            )}

            {activeTab === 'gfr' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Ikä" value={gfr.age} onChange={e => setGfr({...gfr, age: e.target.value})} className="p-4 bg-slate-50 border rounded-2xl font-bold" />
                  <input placeholder="Paino (kg)" value={gfr.w} onChange={e => setGfr({...gfr, w: e.target.value})} className="p-4 bg-slate-50 border rounded-2xl font-bold" />
                </div>
                <input placeholder="Kreatiniini (µmol/l)" value={gfr.creat} onChange={e => setGfr({...gfr, creat: e.target.value})} className="p-4 bg-slate-50 border rounded-2xl font-bold w-full" />
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button onClick={() => setGfr({...gfr, sex: '1.23'})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${gfr.sex === '1.23' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Mies</button>
                  <button onClick={() => setGfr({...gfr, sex: '1.04'})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${gfr.sex === '1.04' ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500'}`}>Nainen</button>
                </div>
              </div>
            )}
          </div>

          <button onClick={executeCalculation} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all uppercase tracking-[0.2em] mt-8">
            Muodosta / Laske
          </button>
        </div>

        {/* RIGHT PANEL */}
        <div className="bg-slate-50 rounded-[2.5rem] p-6 sm:p-8 shadow-sm flex flex-col border border-slate-200 min-h-[600px]">
          <div className="flex justify-between items-center mb-8">
             <p className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
               <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></div> Tulos
             </p>
             {result && (
               <button onClick={handleCopy} className={`px-5 py-2.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-2 shadow-sm ${copied ? 'bg-emerald-500 text-white' : 'bg-white border text-slate-600 hover:bg-slate-100'}`}>
                 {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'KOPIOITU' : 'KOPIOI TEKSTI'}
               </button>
             )}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {result ? (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                
                {result.type === 'pca' && (
                  <div className="space-y-4">
                    <div className="bg-white p-6 rounded-[2rem] border shadow-sm border-blue-100">
                      <h3 className="text-[11px] font-black text-blue-400 uppercase mb-5 flex items-center gap-2"><ClipboardList size={16}/> Perustiedot</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Kasetti / Kesto</p>
                          <p className="text-md font-black">{result.data.kas} ml / {result.data.dNum} vrk</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Nopeus / Bolus</p>
                          <p className="text-md font-black text-blue-600">{result.data.spdNum} ml/h | {result.data.bolus} ml</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border shadow-sm border-emerald-100">
                      <h3 className="text-[11px] font-black text-emerald-500 uppercase mb-4 flex items-center gap-2"><Syringe size={16}/> Lääkkeet & Liuos</h3>
                      <div className="space-y-3">
                        {result.data.outList.map((d: any, i: number) => (
                          <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-3">
                            <div><p className="text-sm font-bold text-slate-800">{d.name}</p><p className="text-[11px] text-slate-400 font-medium">{d.mgDay} mg/vrk</p></div>
                            <div className="text-right"><p className="text-sm font-black text-slate-900">{d.mgTotal} mg</p><p className="text-[11px] text-emerald-600 font-black">{d.mlTotal} ml</p></div>
                          </div>
                        ))}
                        <div className="pt-3 flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-dashed">
                          <span className="text-xs font-bold text-slate-700">NaCl 0,9 % ad {result.data.adNum} ml</span>
                          <span className="text-sm font-black text-slate-900">+{(result.data.adNum - result.data.totMl).toFixed(1)} ml</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200">
                      <h3 className="text-[11px] font-black text-white/40 uppercase mb-4 flex items-center gap-2 tracking-widest"><FlaskConical size={16} className="text-emerald-400"/> Pitoisuudet</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {result.data.concList.map((c: any, i: number) => (
                          <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center sm:block">
                            <p className="text-[10px] text-white/50 uppercase font-black truncate">{c.name}</p>
                            <p className="text-lg font-black text-emerald-400">{c.conc} <span className="text-[10px] font-bold">mg/ml</span></p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {result.type === 'peds_structured' && (
                  <div className="space-y-4">
                    <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
                      <div className="relative z-10">
                        <p className="text-[11px] font-bold uppercase opacity-70 mb-2 tracking-widest flex items-center gap-2"><Info size={14}/> Kerta-annos</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-6xl font-black">{result.data.singleMl.toFixed(2)}</span>
                          <span className="text-2xl font-bold opacity-80">ml</span>
                        </div>
                        <div className="mt-6 pt-4 border-t border-white/20 flex justify-between items-center">
                          <span className="text-sm font-medium opacity-90">Vastaa: {result.data.singleMg.toFixed(2)} mg</span>
                          <span className="text-xl font-black">x {result.data.times}/vrk</span>
                        </div>
                      </div>
                      <Baby size={120} className="absolute -bottom-6 -right-6 text-white/10 rotate-12" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-5 rounded-[2rem] border shadow-sm text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Vuorokausi</p>
                        <p className="text-xl font-black text-slate-800">{result.data.dailyMl.toFixed(1)} ml</p>
                      </div>
                      <div className="bg-white p-5 rounded-[2rem] border shadow-sm text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Paino</p>
                        <p className="text-xl font-black text-slate-800">{result.data.w} kg</p>
                      </div>
                    </div>

                    {result.data.recipe && (
                      <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                        <h3 className="text-[11px] font-black text-amber-600 uppercase mb-4 tracking-widest">Reseptisuunnitelma</h3>
                        <div className="bg-amber-500/10 p-5 rounded-2xl flex justify-between items-center">
                           <span className="text-sm font-black text-amber-900">{result.data.recipe.bottles} pulloa ({result.data.recipe.bSize} ml)</span>
                           <span className="text-xs font-bold text-amber-700">Yht. {result.data.recipe.totalCourseMl} ml</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {result.type === 'single' && (
                  <div className="text-center bg-white p-12 rounded-[3rem] border shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                    <div className="text-8xl font-black text-slate-900 tracking-tighter mb-4">{result.score}</div>
                    <div className="px-8 py-3 bg-blue-600 rounded-full text-[11px] font-black uppercase text-white tracking-[0.2em]">{result.desc}</div>
                  </div>
                )}

                {result.type === 'dual' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-8 rounded-[2.5rem] border text-center shadow-sm">
                        <p className="text-[11px] font-black text-slate-400 uppercase mb-3">CHADS-VASc</p>
                        <div className="text-6xl font-black text-blue-600">{result.score}</div>
                      </div>
                      <div className={`p-8 rounded-[2.5rem] border text-center shadow-sm ${result.hbScore >= 3 ? 'bg-red-50 border-red-100' : 'bg-white'}`}>
                        <p className="text-[11px] font-black text-slate-400 uppercase mb-3">HAS-BLED</p>
                        <div className={`text-6xl font-black ${result.hbScore >= 3 ? 'text-red-600' : 'text-blue-600'}`}>{result.hbScore}</div>
                      </div>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-[2rem] text-center text-white text-[11px] font-bold uppercase">{result.desc}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-30 italic py-20">
                <Calculator size={80} className="mb-6" strokeWidth={0.5}/>
                <p className="text-xs font-black uppercase tracking-[0.3em]">Valitse työkalu ja laske</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
