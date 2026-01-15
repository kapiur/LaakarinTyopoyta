"use client";
import { useState, useEffect } from 'react';
import { Calculator, Activity, Zap, Clipboard, Info, Settings, Plus, Trash2, FileText, Brain } from 'lucide-react';

export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState('pca');
  const [result, setResult] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);

  // --- Библиотека препаратов для PCA ---
  const [library, setLibrary] = useState([
    { n: "Morfiini", s: 20 },
    { n: "Midatsolaami", s: 5 },
    { n: "Robinul", s: 0.2 }
  ]);
  const [newLibDrug, setNewLibDrug] = useState({ n: '', s: '' });

  useEffect(() => {
    const saved = localStorage.getItem('pca_lib');
    if (saved) setLibrary(JSON.parse(saved));
  }, []);

  // --- Состояния калькуляторов ---
  const [pca, setPca] = useState({ kas: 50, ad: 25, spd: 0.4, days: 3 });
  const [selectedDrugs, setSelectedDrugs] = useState([
    { name: 'none', val: 0 },
    { name: 'none', val: 0 },
    { name: 'none', val: 0 }
  ]);

  const [bmi, setBmi] = useState({ h: 175, w: 75 });
  const [gfr, setGfr] = useState({ age: 65, w: 75, creat: 100, sex: 1.23 });
  const [pain, setPain] = useState(0);
  const [gcs, setGcs] = useState({ e: 4, v: 5, m: 6 });

  // --- ФУНКЦИИ РАСЧЕТА ---

  const addDrugToLib = () => {
    if (newLibDrug.n && newLibDrug.s) {
      const updated = [...library, { n: newLibDrug.n, s: parseFloat(newLibDrug.s) }];
      setLibrary(updated);
      localStorage.setItem('pca_lib', JSON.stringify(updated));
      setNewLibDrug({ n: '', s: '' });
    }
  };

  const removeDrugFromLib = (index: number) => {
    const updated = library.filter((_, i) => i !== index);
    setLibrary(updated);
    localStorage.setItem('pca_lib', JSON.stringify(updated));
  };

  const calcPCA = () => {
    let out = "", totMl = 0, conc = "";
    selectedDrugs.forEach(drug => {
      if (drug.name === 'none' || drug.val <= 0) return;
      const libData = library.find(l => l.n === drug.name);
      if (!libData) return;
      const mgTotal = drug.val * pca.days;
      const ml = mgTotal / libData.s;
      totMl += ml;
      out += `${drug.name}: ${drug.val} mg/vrk (${mgTotal.toFixed(1)} mg/${pca.days}vrk) eli ${ml.toFixed(1)} ml\n`;
      conc += `${drug.name.split(' ')[0]}: ${(mgTotal / pca.ad).toFixed(libData.s < 1 ? 3 : 2)} mg/ml\n`;
    });
    if (!out) return alert("Valitse lääke!");
    const bolus = (pca.spd * 2).toFixed(1);
    const text = `PCA-ohje:\n\nPCA ${pca.days} vrk, ${pca.kas} ml kasetti.\n${out}\nLääkkeet yhteensä: ${totMl.toFixed(1)} ml\nNaCl 0,9 % ad ${pca.ad} ml (${(pca.ad - totMl).toFixed(1)} ml)\n\nPitoisuudet:\n${conc}\nNopeus: ${pca.spd} ml/h\nBolus: ${bolus} ml (2x tuntiannos), 20 min lukitus.`;
    setResult(text);
  };

  const calcBMI = () => {
    const hM = bmi.h / 100;
    const score = bmi.w / (hM * hM);
    let desc = "Normaali";
    if (score < 18.5) desc = "Alipaino";
    else if (score > 30) desc = "Lihavuus";
    else if (score > 25) desc = "Ylipaino";
    setResult({ score: score.toFixed(1), desc });
  };

  const calcGFR = () => {
    const score = ((140 - gfr.age) * gfr.w * gfr.sex) / gfr.creat;
    setResult({ score: Math.round(score), desc: "ML/MIN (C-G)" });
  };

  const updateGCS = (key: string, val: number) => {
    const newGcs = { ...gcs, [key]: val };
    setGcs(newGcs);
    const total = newGcs.e + newGcs.v + newGcs.m;
    const desc = total <= 8 ? "Vakava aivovamma" : total <= 12 ? "Keskivaikea" : "Normaali/Lievä";
    setResult({ score: total, desc });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 px-4 text-slate-900">
      {/* TABS */}
      <div className="flex bg-white p-1 rounded-2xl border shadow-sm overflow-x-auto no-scrollbar">
        {['pca', 'bmi', 'gfr', 'pain', 'gcs'].map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setResult(null); }}
            className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
          
          {/* PCA */}
          {activeTab === 'pca' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="text-yellow-500" /> PCA-laskuri</h2>
                <button onClick={() => setShowSettings(!showSettings)} className="text-slate-400 hover:text-blue-600 flex items-center gap-1 text-[10px] font-bold uppercase"><Settings size={14}/> Asetukset</button>
              </div>
              {showSettings && (
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border">
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">Kasetti (ml)</label><input type="number" value={pca.kas} onChange={e => setPca({...pca, kas: +e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">Ad (ml)</label><input type="number" value={pca.ad} onChange={e => setPca({...pca, ad: +e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">Nopeus (ml/h)</label><input type="number" step="0.1" value={pca.spd} onChange={e => setPca({...pca, spd: +e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase">Vrk</label><input type="number" value={pca.days} onChange={e => setPca({...pca, days: +e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></div>
                </div>
              )}
              {selectedDrugs.map((sd, i) => (
                <div key={i} className="p-3 bg-slate-50/50 border rounded-xl grid grid-cols-5 gap-3">
                  <select className="col-span-3 p-2 bg-white border rounded-lg text-sm" value={sd.name} onChange={e => { const n = [...selectedDrugs]; n[i].name = e.target.value; setSelectedDrugs(n); }}>
                    <option value="none">-- Tyhjä --</option>
                    {library.map(l => <option key={l.n} value={l.n}>{l.n} ({l.s} mg/ml)</option>)}
                  </select>
                  <input type="number" className="col-span-2 p-2 bg-white border rounded-lg text-sm font-bold" value={sd.val} onChange={e => { const n = [...selectedDrugs]; n[i].val = +e.target.value; setSelectedDrugs(n); }} />
                </div>
              ))}
              <button onClick={calcPCA} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">MUODOSTA OHJE</button>
              <details className="text-[10px] font-bold text-slate-400 uppercase"><summary className="cursor-pointer">Lääkekirjasto</summary>
                <div className="p-3 bg-slate-50 rounded-xl mt-2 space-y-2">
                  <div className="flex gap-2"><input placeholder="Nimi" value={newLibDrug.n} onChange={e => setNewLibDrug({...newLibDrug, n: e.target.value})} className="flex-1 p-2 border rounded-lg" /><input placeholder="mg/ml" type="number" value={newLibDrug.s} onChange={e => setNewLibDrug({...newLibDrug, s: e.target.value})} className="w-20 p-2 border rounded-lg" /><button onClick={addDrugToLib} className="p-2 bg-slate-800 text-white rounded-lg"><Plus size={16}/></button></div>
                  {library.map((l, i) => <div key={i} className="flex justify-between p-2 bg-white rounded border"><span>{l.n} ({l.s})</span><button onClick={() => removeDrugFromLib(i)}><Trash2 size={12}/></button></div>)}
                </div>
              </details>
            </div>
          )}

          {/* BMI */}
          {activeTab === 'bmi' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold flex items-center gap-2"><Activity size={20}/> BMI-laskuri</h2>
              <div className="space-y-4">
                <div><label className="text-xs font-bold text-slate-400">PITUUS (CM)</label><input type="number" value={bmi.h} onChange={e => setBmi({...bmi, h: +e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border font-bold" /></div>
                <div><label className="text-xs font-bold text-slate-400">PAINO (KG)</label><input type="number" value={bmi.w} onChange={e => setBmi({...bmi, w: +e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border font-bold" /></div>
                <button onClick={calcBMI} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-wide">Laske BMI</button>
              </div>
            </div>
          )}

          {/* GFR */}
          {activeTab === 'gfr' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold flex items-center gap-2">eGFR (Cockcroft-Gault)</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-400">IKÄ</label><input type="number" value={gfr.age} onChange={e => setGfr({...gfr, age: +e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border" /></div>
                <div><label className="text-xs font-bold text-slate-400">PAINO (KG)</label><input type="number" value={gfr.w} onChange={e => setGfr({...gfr, w: +e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border" /></div>
              </div>
              <div><label className="text-xs font-bold text-slate-400">KREAT (µmol/l)</label><input type="number" value={gfr.creat} onChange={e => setGfr({...gfr, creat: +e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border" /></div>
              <div><label className="text-xs font-bold text-slate-400">SUKUPUOLI</label>
                <select className="w-full p-3 bg-slate-50 border rounded-xl" onChange={e => setGfr({...gfr, sex: +e.target.value})}>
                  <option value="1.23">Mies</option><option value="1.04">Nainen</option>
                </select>
              </div>
              <button onClick={calcGFR} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">LASKE GFR</button>
            </div>
          )}

          {/* PAIN (VAS) */}
          {activeTab === 'pain' && (
            <div className="space-y-8 py-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-center">Kipumittari (VAS)</h2>
              <input type="range" min="0" max="10" value={pain} onChange={e => { setPain(+e.target.value); const d = ["Ei kipua","Lievä","Lievä","Lievä","Kohtalainen","Kohtalainen","Kova","Kova","Sietämätön","Sietämätön","Sietämätön"]; setResult({score: e.target.value, desc: d[+e.target.value]}); }} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              <div className="text-center bg-slate-50 p-8 rounded-3xl border border-dashed">
                <div className="text-8xl font-black text-blue-600">{pain}</div>
                <div className="text-xl font-bold text-slate-400 uppercase tracking-widest mt-2">{["Ei kipua","Lievä","Lievä","Lievä","Kohtalainen","Kohtalainen","Kova","Kova","Sietämätön","Sietämätön","Sietämätön"][pain]}</div>
              </div>
            </div>
          )}

          {/* GCS */}
          {activeTab === 'gcs' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold flex items-center gap-2"><Brain size={20}/> Glasgow Coma Scale</h2>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Silmät (E)</label><select className="w-full p-3 border rounded-xl" onChange={e => updateGCS('e', +e.target.value)}><option value="4">4-Spont</option><option value="3">3-Puhe</option><option value="2">2-Kipu</option><option value="1">1-Ei</option></select></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Puhe (V)</label><select className="w-full p-3 border rounded-xl" onChange={e => updateGCS('v', +e.target.value)}><option value="5">5-Orient</option><option value="4">4-Sekava</option><option value="3">3-Sanoja</option><option value="2">2-Ääntä</option><option value="1">1-Ei</option></select></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase">Moottori (M)</label><select className="w-full p-3 border rounded-xl" onChange={e => updateGCS('m', +e.target.value)}><option value="6">6-Ohjeet</option><option value="5">5-Paikall</option><option value="4">4-Väistää</option><option value="3">3-Flexio</option><option value="2">2-Extens</option><option value="1">1-Ei</option></select></div>
              <p className="text-[10px] text-slate-400 text-center italic mt-4">Tulos päivittyy oikealle automaattisesti</p>
            </div>
          )}

        </div>

        {/* ПРАВАЯ ПАНЕЛЬ: РЕЗУЛЬТАТ */}
        <div className="bg-slate-900 rounded-3xl p-8 text-emerald-400 shadow-2xl relative min-h-[500px] flex flex-col">
          <p className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><Info size={12}/> Tulos / Konsoli</p>
          <div className="flex-1 font-mono text-sm leading-relaxed overflow-auto">
            {result ? (
              typeof result === 'string' ? (
                <div className="animate-in fade-in zoom-in">
                  <div className="whitespace-pre-wrap bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">{result}</div>
                  <button onClick={() => { navigator.clipboard.writeText(result); alert("Kopioitu!"); }} className="mt-6 flex items-center gap-2 px-6 py-3 bg-emerald-500 text-slate-900 rounded-xl font-bold hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"><Clipboard size={18}/> Kopioi ohje</button>
                </div>
              ) : (
                <div className="text-center py-20 animate-in zoom-in">
                  <div className="text-9xl font-black mb-4 tracking-tighter">{result.score}</div>
                  <div className="text-xl font-bold opacity-60 uppercase tracking-widest">{result.desc}</div>
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 italic">
                <Calculator size={64} className="mb-4 opacity-10" /><p>Syötä arvot vasemmalle</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
