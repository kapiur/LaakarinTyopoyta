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
  
  // Состояния для CHADS и HAS-BLED
  const [chads, setChads] = useState({ chf: 0, ht: 0, age: 0, dm: 0, stroke: 0, vasc: 0, sex: 0 });
  const [hasbled, setHasbled] = useState({ sbp: 0, renal: 0, liver: 0, stroke: 0, bleed: 0, inr: 0, age: 0, drugs: 0, alc: 0 });

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
    let textToCopy = typeof result === 'string' ? result : `CHA2DS2-VASc: ${result.score}\nHAS-BLED: ${result.hbScore}\n${result.desc}`;
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
      // 1. CHA2DS2-VASc Logic
      let score = chads.chf + chads.ht + chads.age + chads.dm + chads.stroke + chads.vasc;
      if (chads.sex === 1 && score > 0) score += 1; // Naispuolinen sukupuoli: 1 piste (vain jos muita tekijöitä)
      
      const risks = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 12.5, 15.2];
      const strokeRisk = risks[score] || 15.2;

      // 2. HAS-BLED Logic
      const hbScore = Object.values(hasbled).reduce((a, b) => a + b, 0);
      const hbRisk = hbScore >= 3 ? "SUURI" : "EI SUURI";

      let therapy = score === 0 ? "Ei antikoagulaatiota." : (score === 1 && chads.sex === 0 ? "Harkitse antikoagulaatiota." : "Suositellaan antikoagulaatiota.");
      
      setResult({ 
        score, 
        hbScore,
        desc: `Aivoinfarktiriski: ${strokeRisk}% / vuosi.
${therapy}
HAS-BLED: ${hbScore} p (${hbRisk} VUOTORISKI).`
      });
    }
    // ... bmi, gfr calculations
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 pb-10 text-slate-900">
      <div className="flex bg-white p-1 rounded-xl border shadow-sm overflow-x-auto no-scrollbar gap-1">
        {['pca', 'chads', 'bmi', 'gfr'].map((id) => (
          <button key={id} onClick={() => { setActiveTab(id); setResult(null); }}
            className={`flex-1 py-2 px-4 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            {id}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-[2rem] p-6 border shadow-sm space-y-4 overflow-y-auto max-h-[750px] no-scrollbar">
          <h2 className="text-lg font-bold uppercase text-blue-600 tracking-tight">{activeTab === 'chads' ? 'CHA2DS2-VASc & HAS-BLED' : `${activeTab}-Laskuri`}</h2>

          {activeTab === 'pca' && (
            <div className="space-y-3">
              {/* PCA UI (Drugs selection, Settings, Library) */}
              {showSettings && (
                <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {['kas', 'ad', 'spd', 'days'].map(k => (
                    <div key={k}><label className="text-[8px] font-bold uppercase text-slate-400">{k}</label>
                    <input value={pca[k as keyof typeof pca]} onChange={e => setPca({...pca, [k]: e.target.value})} className="w-full p-1 border rounded text-xs font-bold" /></div>
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
              {/* Library details button */}
              <button onClick={addDrugToLib} className="hidden"></button> {/* Placeholder to keep logic */}
            </div>
          )}

          {activeTab === 'chads' && (
            <div className="space-y-6 animate-in fade-in">
              {/* CHA2DS2-VASc Section */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">CHA2DS2-VASc (Infarktiriski)</p>
                <div className="grid grid-cols-1 gap-1">
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
                      className={`p-2 text-left rounded-lg border text-[10px] font-bold transition-all ${chads[i.k as keyof typeof chads] === i.v ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-100'}`}>
                      {i.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* HAS-BLED Section */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest border-b border-red-100 pb-1">HAS-BLED (Vuotoriski)</p>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { l: "RR-syst. > 160 mmHg (1p)", k: 'sbp', v: 1 },
                    { l: "Munuaisten vajaatoiminta (1p)", k: 'renal', v: 1 },
                    { l: "Maksan vajaatoiminta (1p)", k: 'liver', v: 1 },
                    { l: "Aiempi aivohalvaus (1p)", k: 'stroke', v: 1 },
                    { l: "Aiempi verenvuoto / taipumus (1p)", k: 'bleed', v: 1 },
                    { l: "Labiili INR (1p)", k: 'inr', v: 1 },
                    { l: "Ikä > 65 vuotta (1p)", k: 'age', v: 1 },
                    { l: "Lääkitys (NSAID / ASA) (1p)", k: 'drugs', v: 1 },
                    { l: "Alkoholin runsas käyttö (1p)", k: 'alc', v: 1 },
                  ].map(i => (
                    <button key={i.l} onClick={() => setHasbled({...hasbled, [i.k]: hasbled[i.k as keyof typeof hasbled] === i.v ? 0 : i.v})}
                      className={`p-2 text-left rounded-lg border text-[10px] font-bold transition-all ${hasbled[i.k as keyof typeof hasbled] === i.v ? 'bg-red-600 border-red-600 text-white shadow-sm' : 'bg-red-50/30 border-red-100 text-slate-600'}`}>
                      {i.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button onClick={executeCalculation} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg uppercase tracking-widest text-[11px]">Muodosta / Laske</button>
        </div>

        {/* RIGHT: CONSOLE */}
        <div className="bg-[#0f172a] rounded-[2rem] p-6 shadow-2xl flex flex-col border border-slate-800 h-full min-h-[500px]">
          <p className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Tulos / Konsoli
          </p>
          <div className="flex-1 flex flex-col items-center justify-center">
            {result ? (
              <div className="w-full">
                {typeof result === 'string' ? (
                  <div className="space-y-4 w-full">
                    <pre className="text-left bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10 text-emerald-400 font-mono text-[11px] whitespace-pre-wrap">{result}</pre>
                    <button onClick={handleCopy} className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${copied ? 'bg-emerald-500 text-slate-900' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                      {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'KOPIOITU' : 'KOPIOI'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
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
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-800/50 px-6 py-4 rounded-3xl border border-slate-700/50 inline-block whitespace-pre-line leading-relaxed">
                      {result.desc}
                    </div>
                    <button onClick={handleCopy} className="mt-6 w-full py-2 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-700 transition-colors">Kopioi Tulos</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="opacity-10 text-slate-400 text-center uppercase text-[10px] font-bold tracking-widest">
                <Calculator size={60} className="mx-auto mb-4" /> Valitse työkalu
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
