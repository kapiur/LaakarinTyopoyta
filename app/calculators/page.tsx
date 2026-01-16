"use client";
import { useState, useEffect } from 'react';
import { Calculator, Activity, Zap, Clipboard, Info, Settings, Plus, Trash2, Brain, Heart, AlertTriangle, Baby } from 'lucide-react';

export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState('pca');
  const [result, setResult] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);

  // --- СОСТОЯНИЯ (Все числа как строки для удобства ввода) ---
  const [pca, setPca] = useState({ kas: '50', ad: '25', spd: '0.4', days: '3' });
  const [selectedDrugs, setSelectedDrugs] = useState([{ name: 'none', val: '' }, { name: 'none', val: '' }, { name: 'none', val: '' }]);
  const [library, setLibrary] = useState([{ n: "Morfiini", s: 20 }, { n: "Midatsolaami", s: 5 }, { n: "Robinul", s: 0.2 }]);
  const [newLibDrug, setNewLibDrug] = useState({ n: '', s: '' });
  
  const [bmi, setBmi] = useState({ h: '175', w: '75' });
  const [gfr, setGfr] = useState({ age: '65', w: '75', creat: '100', sex: '1.23' });
  const [pain, setPain] = useState(0);
  const [gcs, setGcs] = useState({ e: 4, v: 5, m: 6 });
  const [chads, setChads] = useState({ age: 0, sex: 0, chf: 0, ht: 0, stroke: 0, vasc: 0, dm: 0 });
  const [news, setNews] = useState({ rr: 0, sao2: 0, o2: 0, temp: 0, sbp: 0, hr: 0, cons: 0 });
  const [peds, setPeds] = useState({ weight: '', doseMgKg: '', strength: '' });

  useEffect(() => {
    const saved = localStorage.getItem('pca_lib');
    if (saved) setLibrary(JSON.parse(saved));
  }, []);

  const handleNumChange = (value: string, callback: (v: string) => void) => {
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) callback(value);
  };

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

  const calcBMI = () => {
    const h = parseFloat(bmi.h) / 100;
    const w = parseFloat(bmi.w);
    if (!h || !w) return;
    const score = w / (h * h);
    let desc = "Normaali";
    if (score < 18.5) desc = "Alipaino";
    else if (score > 30) desc = "Lihavuus";
    else if (score > 25) desc = "Ylipaino";
    setResult({ score: score.toFixed(1), desc });
  };

  const calcGFR = () => {
    const score = ((140 - parseFloat(gfr.age)) * parseFloat(gfr.w) * parseFloat(gfr.sex)) / parseFloat(gfr.creat);
    setResult({ score: Math.round(score), desc: "ML/MIN (C-G)" });
  };

  const updateGCS = (key: string, val: number) => {
    const newGcs = { ...gcs, [key]: val };
    setGcs(newGcs);
    const total = newGcs.e + newGcs.v + newGcs.m;
    const desc = total <= 8 ? "Vakava aivovamma" : total <= 12 ? "Keskivaikea" : "Normaali/Lievä";
    setResult({ score: total, desc });
  };

  const calcCHADS = () => {
    const score = Object.values(chads).reduce((a, b) => a + b, 0);
    let risk = "Matala";
    if (score >= 2) risk = "Korkea (Antikoagulaatio suositeltu)";
    else if (score === 1) risk = "Keskisuuri (Harkitse antikoagulaatiota)";
    setResult({ score, desc: risk });
  };

  const calcNEWS = () => {
    const score = Object.values(news).reduce((a, b) => a + b, 0);
    let level = "Matala";
    if (score >= 7) level = "Korkea (Välitön vaste)";
    else if (score >= 5) level = "Keskisuuri (Kiireellinen vaste)";
    setResult({ score, desc: `NEWS-PISTEET: ${level}` });
  };

  const calcPeds = () => {
    const w = parseFloat(peds.weight);
    const d = parseFloat(peds.doseMgKg);
    const s = parseFloat(peds.strength);
    if (!w || !d || !s) return alert("Täytä kaikki kentät!");
    const totalMg = w * d;
    const totalMl = totalMg / s;
    setResult(`PEDIATRINEN ANNOS:\n\nPaino: ${w} kg\nAnnos: ${d} mg/kg\nVahvuus: ${s} mg/ml\n\nKerta-annos: ${totalMg.toFixed(2)} mg\nTilavuus: ${totalMl.toFixed(2)} ml`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4 text-slate-900">
      {/* TABS */}
      <div className="flex bg-white p-1 rounded-2xl border shadow-sm overflow-x-auto no-scrollbar gap-1">
        {[
          { id: 'pca', label: 'PCA', icon: <Zap size={14}/> },
          { id: 'chads', label: 'CHADS', icon: <Heart size={14}/> },
          { id: 'news', label: 'NEWS2', icon: <AlertTriangle size={14}/> },
          { id: 'peds', label: 'Peds', icon: <Baby size={14}/> },
          { id: 'bmi', label: 'BMI', icon: <Activity size={14}/> },
          { id: 'gfr', label: 'GFR', icon: <Calculator size={14}/> },
          { id: 'pain', label: 'Kipu', icon: <Activity size={14}/> },
          { id: 'gcs', label: 'GCS', icon: <Brain size={14}/> }
        ].map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setResult(null); }}
            className={`flex-1 py-3 px-4 rounded-xl text-[11px] font-bold transition-all uppercase flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6">
          
          {/* PCA */}
          {activeTab === 'pca' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2 text-yellow-600"><Zap size={20}/> PCA-Laskuri</h2>
                <button onClick={() => setShowSettings(!showSettings)} className="text-slate-400 hover:text-blue-600 flex items-center gap-1 text-[10px] font-bold uppercase"><Settings size={14}/> Asetukset</button>
              </div>
              {showSettings && (
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border">
                  {['kas', 'ad', 'spd', 'days'].map(key => (
                    <div key={key}>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">{key}</label>
                      <input type="text" value={pca[key as keyof typeof pca]} onFocus={e => e.target.select()} onChange={e => handleNumChange(e.target.value, v => setPca({...pca, [key]: v}))} className="w-full p-2 border rounded-lg text-sm font-bold" />
                    </div>
                  ))}
                </div>
              )}
              {selectedDrugs.map((sd, i) => (
                <div key={i} className="p-3 bg-slate-50/50 border rounded-xl grid grid-cols-5 gap-3">
                  <select className="col-span-3 p-2 bg-white border rounded-lg text-sm" value={sd.name} onChange={e => { const n = [...selectedDrugs]; n[i].name = e.target.value; setSelectedDrugs(n); }}>
                    <option value="none">-- Tyhjä --</option>
                    {library.map(l => <option key={l.n} value={l.n}>{l.n} ({l.s} mg/ml)</option>)}
                  </select>
                  <input type="text" placeholder="0" className="col-span-2 p-2 bg-white border rounded-lg text-sm font-bold" value={sd.val} onFocus={e => e.target.select()} onChange={e => handleNumChange(e.target.value, v => { const n = [...selectedDrugs]; n[i].val = v; setSelectedDrugs(n); })} />
                </div>
              ))}
              <button onClick={calcPCA} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">MUODOSTA OHJE</button>
              <details className="text-[10px] font-bold text-slate-400 uppercase"><summary className="cursor-pointer">Lääkekirjasto</summary>
                <div className="p-3 bg-slate-50 rounded-xl mt-2 space-y-2">
                  <div className="flex gap-2"><input placeholder="Nimi" value={newLibDrug.n} onChange={e => setNewLibDrug({...newLibDrug, n: e.target.value})} className="flex-1 p-2 border rounded-lg text-xs" /><input placeholder="mg/ml" type="text" value={newLibDrug.s} onChange={e => handleNumChange(e.target.value, v => setNewLibDrug({...newLibDrug, s: v}))} className="w-20 p-2 border rounded-lg text-xs" /><button onClick={addDrugToLib} className="p-2 bg-slate-800 text-white rounded-lg"><Plus size={16}/></button></div>
                  {library.map((l, i) => <div key={i} className="flex justify-between p-2 bg-white rounded border text-[11px]"><span>{l.n} ({l.s})</span><button onClick={() => removeDrugFromLib(i)}><Trash2 size={12}/></button></div>)}
                </div>
              </details>
            </div>
          )}

          {/* CHA2DS2-VASc */}
          {activeTab === 'chads' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-600"><Heart size={20}/> CHA2DS2-VASc</h2>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: "Ikä 65-74 (1p)", key: 'age', val: 1 },
                  { label: "Ikä ≥ 75 (2p)", key: 'age', val: 2 },
                  { label: "Sydämen vajaatoiminta (1p)", key: 'chf', val: 1 },
                  { label: "Hypertensio (1p)", key: 'ht', val: 1 },
                  { label: "Aivoinfarkti/TIA-historia (2p)", key: 'stroke', val: 2 },
                  { label: "Vaskulaarisairaus (1p)", key: 'vasc', val: 1 },
                  { label: "Diabetes (1p)", key: 'dm', val: 1 },
                  { label: "Naispuolinen sukupuoli (1p)", key: 'sex', val: 1 },
                ].map(item => (
                  <button key={item.label} onClick={() => setChads({...chads, [item.key as keyof typeof chads]: chads[item.key as keyof typeof chads] === item.val ? 0 : item.val})}
                    className={`p-3 text-left rounded-xl border text-sm transition-all ${chads[item.key as keyof typeof chads] === item.val ? 'bg-red-50 border-red-200 font-bold' : 'bg-slate-50'}`}>
                    {item.label}
                  </button>
                ))}
              </div>
              <button onClick={calcCHADS} className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold">LASKE</button>
            </div>
          )}

          {/* NEWS2 */}
          {activeTab === 'news' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold flex items-center gap-2 text-orange-600"><AlertTriangle size={20}/> NEWS2 Score</h2>
              <div className="space-y-3">
                {[
                  { label: 'Hengitystaajuus', key: 'rr', opts: [{l:'12-20', v:0}, {l:'9-11', v:1}, {l:'21-24', v:2}, {l:'≤8 tai ≥25', v:3}] },
                  { label: 'SpO2 (%)', key: 'sao2', opts: [{l:'≥96', v:0}, {l:'94-95', v:1}, {l:'92-93', v:2}, {l:'≤91', v:3}] },
                  { label: 'Lisähappi', key: 'o2', opts: [{l:'Ei', v:0}, {l:'Kyllä', v:2}] },
                  { label: 'Systolinen VP', key: 'sbp', opts: [{l:'111-219', v:0}, {l:'101-110', v:1}, {l:'91-100', v:2}, {l:'≤90 tai ≥220', v:3}] },
                  { label: 'Syke', key: 'hr', opts: [{l:'51-90', v:0}, {l:'41-50 tai 91-110', v:1}, {l:'111-130', v:2}, {l:'≤40 tai ≥131', v:3}] },
                  { label: 'Tajunta', key: 'cons', opts: [{l:'A (Valpas)', v:0}, {l:'V, P tai U', v:3}] }
                ].map(item => (
                  <div key={item.key}>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</label>
                    <select className="w-full p-2 bg-slate-50 border rounded-lg text-sm" onChange={e => setNews({...news, [item.key]: +e.target.value})}>
                      {item.opts.map(o => <option key={o.l} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <button onClick={calcNEWS} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold">LASKE</button>
            </div>
          )}

          {/* PED-DOSE */}
          {activeTab === 'peds' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold flex items-center gap-2 text-blue-500"><Baby size={20}/> Pediaatrinen annos</h2>
              <div className="space-y-4">
                {['weight', 'doseMgKg', 'strength'].map(key => (
                  <div key={key}>
                    <label className="text-xs font-bold text-slate-400 uppercase">{key === 'weight' ? 'Paino (kg)' : key === 'doseMgKg' ? 'Annos (mg/kg)' : 'Vahvuus (mg/ml)'}</label>
                    <input type="text" value={peds[key as keyof typeof peds]} onFocus={e => e.target.select()} onChange={e => handleNumChange(e.target.value, v => setPeds({...peds, [key]: v}))} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" />
                  </div>
                ))}
                <button onClick={calcPeds} className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold">LASKE</button>
              </div>
            </div>
          )}

          {/* BMI */}
          {activeTab === 'bmi' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-600"><Activity size={20}/> BMI</h2>
              <div className="space-y-4">
                <div><label className="text-xs font-bold text-slate-400">PITUUS (CM)</label><input type="text" value={bmi.h} onFocus={e => e.target.select()} onChange={e => handleNumChange(e.target.value, v => setBmi({...bmi, h: v}))} className="w-full p-4 bg-slate-50 border rounded-xl font-bold" /></div>
                <div><label className="text-xs font-bold text-slate-400">PAINO (KG)</label><input type="text" value={bmi.w} onFocus={e => e.target.select()} onChange={e => handleNumChange(e.target.value, v => setBmi({...bmi, w: v}))} className="w-full p-4 bg-slate-50 border rounded-xl font-bold" /></div>
                <button onClick={calcBMI} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase">Laske</button>
              </div>
            </div>
          )}

          {/* GFR */}
          {activeTab === 'gfr' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold flex items-center gap-2">eGFR</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-400">IKÄ</label><input type="text" value={gfr.age} onFocus={e => e.target.select()} onChange={e => handleNumChange(e.target.value, v => setGfr({...gfr, age: v}))} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" /></div>
                <div><label className="text-xs font-bold text-slate-400">PAINO</label><input type="text" value={gfr.w} onFocus={e => e.target.select()} onChange={e => handleNumChange(e.target.value, v => setGfr({...gfr, w: v}))} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" /></div>
              </div>
              <label className="text-xs font-bold text-slate-400">KREAT (µmol/l)</label><input type="text" value={gfr.creat} onFocus={e => e.target.select()} onChange={e => handleNumChange(e.target.value, v => setGfr({...gfr, creat: v}))} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" />
              <button onClick={calcGFR} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">LASKE</button>
            </div>
          )}

          {/* PAIN */}
          {activeTab === 'pain' && (
            <div className="space-y-8 py-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-center">VAS</h2>
              <input type="range" min="0" max="10" value={pain} onChange={e => { setPain(+e.target.value); const d = ["Ei kipua","Lievä","Lievä","Lievä","Kohtalainen","Kohtalainen","Kova","Kova","Sietämätön","Sietämätön","Sietämätön"]; setResult({score: e.target.value, desc: d[+e.target.value]}); }} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              <div className="text-center bg-slate-50 p-8 rounded-3xl border border-dashed"><div className="text-9xl font-black text-blue-600">{pain}</div></div>
            </div>
          )}

          {/* GCS */}
          {activeTab === 'gcs' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold flex items-center gap-2"><Brain size={20}/> GCS</h2>
              {['e', 'v', 'm'].map(k => (
                <div key={k}><label className="text-[10px] font-bold text-slate-400 uppercase">{k === 'e' ? 'Eyes' : k === 'v' ? 'Verbal' : 'Motor'}</label><select className="w-full p-3 border rounded-xl font-bold text-sm" onChange={e => updateGCS(k, +e.target.value)}>
                  {k === 'e' ? <><option value="4">4-Spont</option><option value="3">3-Puhe</option><option value="2">2-Kipu</option><option value="1">1-Ei</option></> : 
                   k === 'v' ? <><option value="5">5-Orient</option><option value="4">4-Sekava</option><option value="3">3-Sanoja</option><option value="2">2-Ääntä</option><option value="1">1-Ei</option></> : 
                   <><option value="6">6-Ohjeet</option><option value="5">5-Paikall</option><option value="4">4-Väistää</option><option value="3">3-Flexio</option><option value="2">2-Extens</option><option value="1">1-Ei</option></>}
                </select></div>
              ))}
            </div>
          )}
        </div>

        {/* РЕЗУЛЬТАТ */}
        <div className="bg-slate-900 rounded-3xl p-8 text-emerald-400 shadow-2xl relative min-h-[500px] flex flex-col">
          <p className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><Info size={12}/> Tulos / Konsoli</p>
          <div className="flex-1 font-mono text-sm leading-relaxed overflow-auto">
            {result ? (
              typeof result === 'string' ? (
                <div className="animate-in fade-in zoom-in"><div className="whitespace-pre-wrap bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">{result}</div><button onClick={() => { navigator.clipboard.writeText(result); alert("Kopioitu!"); }} className="mt-6 flex items-center gap-2 px-6 py-3 bg-emerald-500 text-slate-900 rounded-xl font-bold active:scale-95"><Clipboard size={18}/> Kopioi</button></div>
              ) : (
                <div className="text-center py-20 animate-in zoom-in"><div className="text-9xl font-black mb-4 tracking-tighter">{result.score}</div><div className="text-xl font-bold opacity-60 uppercase tracking-widest">{result.desc}</div></div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 italic"><Calculator size={64} className="mb-4 opacity-10" /><p>Valitse työkalu</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
