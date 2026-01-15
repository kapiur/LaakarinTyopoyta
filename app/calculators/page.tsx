"use client";
import { useState, useEffect } from 'react';
import { Calculator, Activity, Zap, Clipboard, Info, Settings, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

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

  // Загрузка библиотеки из памяти при старте
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

  // --- ЛОГИКА PCA ---
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

    if (!out) return alert("Valitse vähintään yksi lääke ja syötä annos!");

    const bolus = (pca.spd * 2).toFixed(1);
    const text = `PCA-ohje:\n\nPCA ${pca.days} vrk, ${pca.kas} ml kasetti.\n${out}\nLääkkeet yhteensä: ${totMl.toFixed(1)} ml\nNaCl 0,9 % ad ${pca.ad} ml (${(pca.ad - totMl).toFixed(1)} ml)\n\nPitoisuudet:\n${conc}\nNopeus: ${pca.spd} ml/h\nBolus: ${bolus} ml (2x tuntiannos), 20 min lukitus.\n\nJos boluksia menee yli 6/8–24 h, nosta nopeutta +0.1 ml/h ad ${(pca.spd + 0.2).toFixed(1)} ml/h ja bolusta +0.2 ml ad ${(parseFloat(bolus) + 0.4).toFixed(1)} ml.\nJos potilas sedatoituu liikaa, vähennä nopeutta –0.1 ml/h.`;
    setResult(text);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 px-4">
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
        {/* INPUT CARD */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-6 overflow-hidden">
          {activeTab === 'pca' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="text-yellow-500" /> PCA-laskuri</h2>
                <button onClick={() => setShowSettings(!showSettings)} className="text-slate-400 hover:text-blue-600 flex items-center gap-1 text-xs font-bold uppercase">
                  <Settings size={14}/> {showSettings ? 'Sulje' : 'Asetukset'}
                </button>
              </div>

              {/* ASETUKSET (Скрытый блок) */}
              {showSettings && (
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Kasetti (ml)</label>
                    <input type="number" value={pca.kas} onChange={e => setPca({...pca, kas: +e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ad (ml)</label>
                    <input type="number" value={pca.ad} onChange={e => setPca({...pca, ad: +e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nopeus (ml/h)</label>
                    <input type="number" step="0.1" value={pca.spd} onChange={e => setPca({...pca, spd: +e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Vrk</label>
                    <input type="number" value={pca.days} onChange={e => setPca({...pca, days: +e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm" />
                  </div>
                </div>
              )}

              {/* Выбор лекарств (3 ряда) */}
              <div className="space-y-3">
                {selectedDrugs.map((sd, i) => (
                  <div key={i} className="p-4 bg-slate-50/50 border rounded-2xl grid grid-cols-5 gap-3">
                    <div className="col-span-3 space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Lääke {i+1}</label>
                      <select value={sd.name} onChange={e => {
                        const next = [...selectedDrugs];
                        next[i].name = e.target.value;
                        setSelectedDrugs(next);
                      }} className="w-full p-2 bg-white border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="none">-- Tyhjä --</option>
                        {library.map(l => <option key={l.n} value={l.n}>{l.n} ({l.s} mg/ml)</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">mg/vrk</label>
                      <input type="number" value={sd.val} onChange={e => {
                        const next = [...selectedDrugs];
                        next[i].val = +e.target.value;
                        setSelectedDrugs(next);
                      }} className="w-full p-2 bg-white border rounded-lg text-sm font-bold" />
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={calcPCA} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">MUODOSTA OHJE</button>

              {/* KIRJASTO (Добавление препаратов) */}
              <div className="mt-4 border-t pt-4">
                <details className="group">
                  <summary className="text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-blue-600 flex items-center gap-2 list-none">
                    <Plus size={14} className="group-open:rotate-45 transition-transform" /> Hallitse lääkevalikoimaa
                  </summary>
                  <div className="mt-4 space-y-3 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Nimi" value={newLibDrug.n} onChange={e => setNewLibDrug({...newLibDrug, n: e.target.value})} className="p-2 border rounded-lg text-sm" />
                      <input placeholder="mg/ml" type="number" value={newLibDrug.s} onChange={e => setNewLibDrug({...newLibDrug, s: e.target.value})} className="p-2 border rounded-lg text-sm" />
                    </div>
                    <button onClick={addDrugToLib} className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold">LISÄÄ KIRJASTOON</button>
                    <div className="max-h-32 overflow-auto space-y-1">
                      {library.map((l, i) => (
                        <div key={i} className="flex justify-between items-center text-[11px] bg-white p-2 rounded-lg border">
                          <span>{l.n} <b>({l.s} mg/ml)</b></span>
                          <button onClick={() => removeDrugFromLib(i)} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            </div>
          )}

          {/* ... ОСТАЛЬНЫЕ КАЛЬКУЛЯТОРЫ (BMI, GFR И Т.Д.) БЕЗ ИЗМЕНЕНИЙ ... */}
          {activeTab === 'bmi' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold flex items-center gap-2"><Activity className="text-emerald-500" /> BMI-laskuri</h2>
              <div className="grid grid-cols-1 gap-4">
                <div><label className="text-xs font-bold text-slate-400 uppercase">Pituus (cm)</label>
                <input type="number" value={bmi.h} onChange={e => setBmi({...bmi, h: +e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border font-bold" /></div>
                <div><label className="text-xs font-bold text-slate-400 uppercase">Paino (kg)</label>
                <input type="number" value={bmi.w} onChange={e => setBmi({...bmi, w: +e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border font-bold" /></div>
                <button onClick={() => {
                  const hM = bmi.h / 100;
                  const res = bmi.w / (hM * hM);
                  setResult({ score: res.toFixed(1), desc: res < 18.5 ? "Alipaino" : res < 25 ? "Normaali" : res < 30 ? "Ylipaino" : "Lihavuus" });
                }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">LASKE</button>
              </div>
            </div>
          )}
          {/* ... (Добавьте GFR, Pain, GCS из прошлого кода) ... */}
        </div>

        {/* RESULT CARD */}
        <div className="bg-slate-900 rounded-3xl p-8 text-emerald-400 shadow-2xl relative min-h-[500px] flex flex-col">
          <p className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <Info size={12}/> Tulos / Konsoli
          </p>
          <div className="flex-1 font-mono text-sm leading-relaxed overflow-auto">
            {result ? (
              typeof result === 'string' ? (
                <div className="animate-in fade-in zoom-in duration-300">
                  <div className="whitespace-pre-wrap bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">{result}</div>
                  <button onClick={() => { navigator.clipboard.writeText(result); alert("Kopioitu!"); }} className="mt-6 flex items-center gap-2 px-6 py-3 bg-emerald-500 text-slate-900 rounded-xl font-bold hover:bg-emerald-400 transition-all active:scale-95">
                    <Clipboard size={18}/> Kopioi ohje
                  </button>
                </div>
              ) : (
                <div className="text-center py-20 animate-in zoom-in duration-300">
                  <div className="text-8xl font-black mb-4">{result.score || result}</div>
                  <div className="text-xl font-bold opacity-60 uppercase tracking-widest">{result.desc || "ML/MIN"}</div>
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 italic">
                <Calculator size={64} className="mb-4 opacity-10" />
                <p>Syötä arvot vasemmalle nähdäksesi tuloksen</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
