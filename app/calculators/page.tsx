"use client";
import { useState, useEffect } from 'react';
import { Calculator, Activity, Zap, Clipboard, Info } from 'lucide-react';

export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState('pca');
  const [result, setResult] = useState<any>(null);

  // Состояния для калькуляторов
  const [bmi, setBmi] = useState({ h: 175, w: 75 });
  const [gfr, setGfr] = useState({ age: 65, w: 75, creat: 100, sex: 1.23 });
  const [pain, setPain] = useState(0);
  const [gcs, setGcs] = useState({ e: 4, v: 5, m: 6 });
  const [pca, setPca] = useState({ kas: 50, ad: 25, spd: 0.4, days: 3 });
  const [pcaDrugs, setPcaDrugs] = useState([
    { name: 'Morfiini', str: 20, val: 0 },
    { name: 'Midatsolaami', str: 5, val: 0 },
    { name: 'Robinul', str: 0.2, val: 0 }
  ]);

  // Логика расчета PCA
  const calcPCA = () => {
    let out = "", totMl = 0, conc = "";
    pcaDrugs.forEach(drug => {
      if (drug.val <= 0) return;
      const mgTotal = drug.val * pca.days;
      const ml = mgTotal / drug.str;
      totMl += ml;
      out += `${drug.name}: ${drug.val} mg/vrk (${mgTotal.toFixed(1)} mg/${pca.days}vrk) eli ${ml.toFixed(1)} ml\n`;
      conc += `${drug.name.split(' ')[0]}: ${(mgTotal / pca.ad).toFixed(drug.str < 1 ? 3 : 2)} mg/ml\n`;
    });

    if (!out) return;

    const bolus = (pca.spd * 2).toFixed(1);
    const text = `PCA-ohje:\n\nPCA ${pca.days} vrk, ${pca.kas} ml kasetti.\n${out}\nLääkkeet yhteensä: ${totMl.toFixed(1)} ml\nNaCl 0,9 % ad ${pca.ad} ml (${(pca.ad - totMl).toFixed(1)} ml)\n\nPitoisuudet:\n${conc}\nNopeus: ${pca.spd} ml/h\nBolus: ${bolus} ml (2x tuntiannos), 20 min lukitus.\n\nJos boluksia menee yli 6/8–24 h, nosta nopeutta +0.1 ml/h ad ${(pca.spd + 0.2).toFixed(1)} ml/h ja bolusta +0.2 ml ad ${(parseFloat(bolus) + 0.4).toFixed(1)} ml.\nJos potilas sedatoituu liikaa, vähennä nopeutta –0.1 ml/h.`;
    setResult(text);
  };

  // Логика BMI
  const calcBMI = () => {
    const hMeters = bmi.h / 100;
    const score = bmi.w / (hMeters * hMeters);
    let desc = "Normaali";
    if (score < 18.5) desc = "Alipaino";
    else if (score > 30) desc = "Lihavuus";
    else if (score > 25) desc = "Ylipaino";
    setResult({ score: score.toFixed(1), desc });
  };

  // Логика GFR
  const calcGFR = () => {
    const score = ((140 - gfr.age) * gfr.w * gfr.sex) / gfr.creat;
    setResult(Math.round(score));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Kopioitu!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* TABS */}
      <div className="flex bg-white p-1 rounded-2xl border shadow-sm overflow-x-auto no-scrollbar">
        {['pca', 'bmi', 'gfr', 'pain', 'gcs'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setResult(null); }}
            className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* INPUT CARD */}
        <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
          {activeTab === 'pca' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="text-yellow-500" /> PCA-laskuri</h2>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
                <div><label className="text-[10px] font-bold text-slate-400 uppercase">Kasetti ml</label>
                <input type="number" value={pca.kas} onChange={e => setPca({...pca, kas: +e.target.value})} className="w-full bg-transparent font-bold border-b border-slate-200 outline-none" /></div>
                <div><label className="text-[10px] font-bold text-slate-400 uppercase">Vrk</label>
                <input type="number" value={pca.days} onChange={e => setPca({...pca, days: +e.target.value})} className="w-full bg-transparent font-bold border-b border-slate-200 outline-none" /></div>
              </div>
              {pcaDrugs.map((drug, i) => (
                <div key={i} className="flex items-end gap-4 p-3 bg-white border rounded-xl shadow-sm">
                  <div className="flex-1 text-sm font-semibold text-slate-600">{drug.name} <span className="text-[10px] text-slate-400">({drug.str} mg/ml)</span></div>
                  <div className="w-24"><label className="text-[9px] text-slate-400 uppercase font-bold">mg/vrk</label>
                  <input type="number" className="w-full p-1 border-b font-bold" value={drug.val} onChange={e => {
                    const newDrugs = [...pcaDrugs];
                    newDrugs[i].val = +e.target.value;
                    setPcaDrugs(newDrugs);
                  }} /></div>
                </div>
              ))}
              <button onClick={calcPCA} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100">MUODOSTA OHJE</button>
            </div>
          )}

          {activeTab === 'bmi' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Activity className="text-emerald-500" /> BMI-laskuri</h2>
              <div className="space-y-4">
                <div><label className="text-xs font-bold text-slate-400">PITUUS (CM)</label>
                <input type="number" value={bmi.h} onChange={e => setBmi({...bmi, h: +e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl outline-none border focus:border-blue-500 font-bold" /></div>
                <div><label className="text-xs font-bold text-slate-400">PAINO (KG)</label>
                <input type="number" value={bmi.w} onChange={e => setBmi({...bmi, w: +e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl outline-none border focus:border-blue-500 font-bold" /></div>
                <button onClick={calcBMI} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">LASKE BMI</button>
              </div>
            </div>
          )}

          {activeTab === 'gfr' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">eGFR (Cockcroft-Gault)</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-400">IKÄ</label>
                <input type="number" value={gfr.age} onChange={e => setGfr({...gfr, age: +e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl outline-none border" /></div>
                <div><label className="text-xs font-bold text-slate-400">PAINO</label>
                <input type="number" value={gfr.w} onChange={e => setGfr({...gfr, w: +e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl outline-none border" /></div>
              </div>
              <label className="text-xs font-bold text-slate-400 uppercase">Kreat (µmol/l)</label>
              <input type="number" value={gfr.creat} onChange={e => setGfr({...gfr, creat: +e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl outline-none border" />
              <label className="text-xs font-bold text-slate-400 uppercase">Sukupuoli</label>
              <select className="w-full p-3 bg-slate-50 border rounded-xl" onChange={e => setGfr({...gfr, sex: +e.target.value})}>
                <option value="1.23">Mies</option>
                <option value="1.04">Nainen</option>
              </select>
              <button onClick={calcGFR} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">LASKE GFR</button>
            </div>
          )}

          {activeTab === 'pain' && (
            <div className="space-y-8 py-4">
              <h2 className="text-xl font-bold text-center">Kipumittari (VAS)</h2>
              <input type="range" min="0" max="10" value={pain} onChange={e => setPain(+e.target.value)} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              <div className="text-center space-y-2">
                <div className="text-7xl font-black text-blue-600">{pain}</div>
                <div className="text-xl font-bold text-slate-400 uppercase tracking-widest">
                  {["Ei kipua","Lievä","Lievä","Lievä","Kohtalainen","Kohtalainen","Kova","Kova","Sietämätön","Sietämätön","Sietämätön"][pain]}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gcs' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Glasgow Coma Scale</h2>
              {[
                { label: 'Eyes (E)', state: 'e', opts: [{v:4, l:'4-Spont'},{v:3, l:'3-Puhe'},{v:2, l:'2-Kipu'},{v:1, l:'1-Ei'}] },
                { label: 'Verbal (V)', state: 'v', opts: [{v:5, l:'5-Orient'},{v:4, l:'4-Sekava'},{v:3, l:'3-Sanoja'},{v:2, l:'2-Ääntä'},{v:1, l:'1-Ei'}] },
                { label: 'Motor (M)', state: 'm', opts: [{v:6, l:'6-Ohjeet'},{v:5, l:'5-Paikall'},{v:4, l:'4-Väistää'},{v:3, l:'3-Flexio'},{v:2, l:'2-Extens'},{v:1, l:'1-Ei'}] }
              ].map(group => (
                <div key={group.label}>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{group.label}</label>
                  <select className="w-full p-2 bg-slate-50 border rounded-lg text-sm" onChange={e => setGcs({...gcs, [group.state]: +e.target.value})}>
                    {group.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}
              <div className="mt-8 p-6 bg-yellow-50 rounded-2xl border border-yellow-100 text-center">
                <div className="text-5xl font-black text-yellow-600">{gcs.e + gcs.v + gcs.m}</div>
                <div className="text-sm font-bold text-yellow-700 mt-2 uppercase">
                  {(gcs.e + gcs.v + gcs.m) <= 8 ? "Vakava aivovamma" : (gcs.e + gcs.v + gcs.m) <= 12 ? "Keskivaikea" : "Normaali/Lievä"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RESULT CARD */}
        <div className="bg-slate-900 rounded-3xl p-8 text-emerald-400 shadow-2xl overflow-hidden relative min-h-[400px]">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20"></div>
          <p className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Info size={12}/> Tulos / Konsoli
          </p>
          
          <div className="font-mono text-sm leading-relaxed">
            {result ? (
              typeof result === 'string' ? (
                <div className="whitespace-pre-wrap animate-in fade-in duration-300">
                  {result}
                  <button onClick={() => copyToClipboard(result)} className="mt-8 flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs hover:bg-emerald-500/20 transition-all text-emerald-400">
                    <Clipboard size={14}/> Kopioi ohje
                  </button>
                </div>
              ) : (
                <div className="text-center py-20 animate-in zoom-in duration-300">
                  <div className="text-8xl font-black mb-4">{result.score || result}</div>
                  <div className="text-xl font-bold opacity-60 uppercase tracking-widest">{result.desc || "ML/MIN"}</div>
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 italic py-20">
                <Calculator size={48} className="mb-4 opacity-20" strokeWidth={1}/>
                Syötä arvot vasemmalle nähdäksesi tuloksen
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
