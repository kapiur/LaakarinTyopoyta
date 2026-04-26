"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Copy, FlaskConical, Plus, RefreshCw, Trash2, Zap } from 'lucide-react';

type PcaLibraryDrug = { id: number; name: string; strength: number };
type SelectedDrug = { drugId: string; dailyDose: string };
type PcaSettings = { cassetteMl: string; adMl: string; speedMlH: string; days: string };

const emptySelectedDrugs: SelectedDrug[] = [
  { drugId: '', dailyDose: '' },
  { drugId: '', dailyDose: '' },
  { drugId: '', dailyDose: '' },
];

function fmt(value: number, digits = 1) {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(digits).replace('.', ',');
}

function fmtDot(value: number, digits = 1) {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(digits);
}

export default function PcaCalculatorPage() {
  const [library, setLibrary] = useState<PcaLibraryDrug[]>([]);
  const [selectedDrugs, setSelectedDrugs] = useState<SelectedDrug[]>(emptySelectedDrugs);
  const [settings, setSettings] = useState<PcaSettings>({ cassetteMl: '50', adMl: '25', speedMlH: '0.4', days: '3' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadLibrary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/pca-library');
      if (!response.ok) throw new Error('PCA-lääkekirjaston lataus epäonnistui');
      const data = await response.json();
      setLibrary(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message ?? 'Lataus epäonnistui');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadLibrary(); }, []);

  const result = useMemo(() => {
    const days = Number(settings.days) || 0;
    const adMl = Number(settings.adMl) || 0;
    const speedMlH = Number(settings.speedMlH) || 0;
    const cassetteMl = Number(settings.cassetteMl) || 0;
    const infusionNeedMl = speedMlH * 24 * days;

    const rows = selectedDrugs.map((item) => {
      const drug = library.find((entry) => entry.id === Number(item.drugId));
      const dailyDose = Number(item.dailyDose) || 0;
      if (!drug || dailyDose <= 0 || days <= 0) return null;
      const totalDose = dailyDose * days;
      const drugVolume = drug.strength > 0 ? totalDose / drug.strength : 0;
      const concentration = adMl > 0 ? totalDose / adMl : 0;
      const hourlyDose = concentration * speedMlH;
      const bolusDose = concentration * speedMlH * 2;
      return { id: drug.id, name: drug.name, strength: drug.strength, dailyDose, totalDose, drugVolume, concentration, hourlyDose, bolusDose };
    }).filter(Boolean) as Array<{ id: number; name: string; strength: number; dailyDose: number; totalDose: number; drugVolume: number; concentration: number; hourlyDose: number; bolusDose: number }>;

    const totalDrugVolume = rows.reduce((sum, row) => sum + row.drugVolume, 0);
    const naclMl = adMl - totalDrugVolume;
    const bolusMl = speedMlH * 2;
    const warnings: string[] = [];

    if (rows.length === 0) warnings.push('Valitse vähintään yksi lääke ja anna vuorokausiannos.');
    if (adMl <= 0) warnings.push('Anna kokonaismäärä ad ml.');
    if (days <= 0) warnings.push('Anna hoidon kesto vuorokausina.');
    if (speedMlH <= 0) warnings.push('Anna tiputusnopeus ml/h.');
    if (totalDrugVolume > adMl && adMl > 0) warnings.push(`Lääkkeet yhteensä ${fmt(totalDrugVolume, 1)} ml ylittää kokonaismäärän ${fmt(adMl, 1)} ml. NaCl-määrä olisi negatiivinen.`);
    if (infusionNeedMl > adMl && adMl > 0) warnings.push(`Valittu ad ${fmt(adMl, 1)} ml ei riitä perusnopeudella ${fmt(speedMlH, 1)} ml/h ${fmt(days, 0)} vrk ajalle. Infuusion tarve on ${fmt(infusionNeedMl, 1)} ml.`);
    if (adMl > cassetteMl && cassetteMl > 0) warnings.push(`Valittu ad ${fmt(adMl, 1)} ml ylittää kasetin koon ${fmt(cassetteMl, 1)} ml.`);
    if (naclMl >= 0 && naclMl < 1 && rows.length > 0) warnings.push(`NaCl-lisä on vain ${fmt(naclMl, 1)} ml. Tarkista käytännön valmistettavuus.`);

    return { rows, days, adMl, speedMlH, cassetteMl, infusionNeedMl, totalDrugVolume, naclMl, bolusMl, suggestedAdMl: infusionNeedMl > 0 ? Math.ceil(infusionNeedMl) : 0, warnings, isReady: rows.length > 0 && warnings.length === 0 };
  }, [library, selectedDrugs, settings]);

  const updateSelectedDrug = (index: number, patch: Partial<SelectedDrug>) => {
    setSelectedDrugs((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const addSelectedDrugRow = () => {
    setSelectedDrugs((prev) => [...prev, { drugId: '', dailyDose: '' }]);
  };

  const removeSelectedDrugRow = (index: number) => {
    setSelectedDrugs((prev) => {
      if (prev.length <= emptySelectedDrugs.length) return prev;
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const resetForm = () => {
    setSelectedDrugs(emptySelectedDrugs);
    setSettings({ cassetteMl: '50', adMl: '25', speedMlH: '0.4', days: '3' });
  };

  const copyText = () => {
    const lines = [
      'PCA-laskelma:',
      '',
      `PCA ${fmtDot(result.days, 0)} vrk, ${fmtDot(result.cassetteMl, 0)} ml kasetti.`,
      '',
      ...result.rows.map((row) => `${row.name} (${fmtDot(row.strength, row.strength < 1 ? 3 : 1)} mg/ml): ${fmtDot(row.dailyDose, 1)} mg/vrk – ${fmtDot(row.totalDose, 1)} mg/${fmtDot(result.days, 0)} vrk – ${fmtDot(row.drugVolume, 1)} ml`),
      '',
      `Lääkkeet yhteensä: ${fmtDot(result.totalDrugVolume, 1)} ml`,
      `NaCl 0,9 % ad ${fmtDot(result.adMl, 1)} ml – lisätään ${fmtDot(result.naclMl, 1)} ml`,
      '',
      'Pitoisuudet:',
      ...result.rows.map((row) => `${row.name}: ${fmtDot(row.concentration, row.strength < 1 ? 3 : 2)} mg/ml`),
      '',
      `Tiputusnopeus: ${fmtDot(result.speedMlH, 1)} ml/h`,
      `Boluslaskenta: ${fmtDot(result.bolusMl, 1)} ml`,
      '',
      'Bolus sisältää laskennallisesti:',
      ...result.rows.map((row) => `${row.name}: ${fmtDot(row.bolusDose, row.strength < 1 ? 3 : 2)} mg`),
      '',
      'Tarkista annokset, yhteensopivuus, munuaistoiminta, sedaatioaste ja paikallinen ohjeistus ennen käyttöönottoa.',
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-5 pb-10 text-slate-900 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link href="/calculators" className="text-xs font-bold text-blue-600 hover:text-blue-700">← Takaisin laskureihin</Link>
          <h1 className="mt-2 text-2xl font-black text-slate-800 flex items-center gap-2"><Zap className="text-blue-600" size={26} /> PCA-laskuri</h1>
          <p className="text-sm text-slate-500 mt-1">Parannettu PCA-laskuri. Lääkekirjaston hallinta on erillisellä Lääkekirjastot-sivulla.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/calculators/peds-library" className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase text-blue-600 hover:bg-blue-50 transition-all">Lääkekirjastot</Link>
          <button onClick={loadLibrary} disabled={isLoading} className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"><RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Päivitä</button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="space-y-4">
            {selectedDrugs.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase ml-1">Lääke {index + 1} ja mg/vrk</label>
                  {selectedDrugs.length > emptySelectedDrugs.length && index >= emptySelectedDrugs.length && (
                    <button
                      onClick={() => removeSelectedDrugRow(index)}
                      className="text-[10px] font-black uppercase text-slate-300 hover:text-red-500 flex items-center gap-1"
                      title="Poista lääkerivi"
                    >
                      <Trash2 size={12} /> Poista
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <select value={item.drugId} onChange={(event) => updateSelectedDrug(index, { drugId: event.target.value })} className="flex-1 p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-sm font-bold outline-none">
                    <option value="">-- Valitse lääke --</option>
                    {library.map((drug) => <option key={drug.id} value={drug.id}>{drug.name} ({drug.strength} mg/ml)</option>)}
                  </select>
                  <input type="number" value={item.dailyDose} onChange={(event) => updateSelectedDrug(index, { dailyDose: event.target.value })} placeholder="mg/vrk" className="w-28 p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-center font-bold outline-none" />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addSelectedDrugRow}
            className="w-full py-3 bg-blue-50 text-blue-700 rounded-2xl text-xs font-black uppercase hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={15} /> Lisää lääke
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Kasetti ml</label><input value={settings.cassetteMl} onChange={(event) => setSettings({ ...settings, cassetteMl: event.target.value })} className="w-full p-3 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none" /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">ad ml</label><input value={settings.adMl} onChange={(event) => setSettings({ ...settings, adMl: event.target.value })} className="w-full p-3 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none" /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">ml/h</label><input value={settings.speedMlH} onChange={(event) => setSettings({ ...settings, speedMlH: event.target.value })} className="w-full p-3 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none" /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">vrk</label><input value={settings.days} onChange={(event) => setSettings({ ...settings, days: event.target.value })} className="w-full p-3 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none" /></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => setSettings({ cassetteMl: '50', adMl: '25', speedMlH: '0.4', days: '3' })} className="p-4 bg-blue-50 text-blue-700 rounded-2xl text-xs font-black uppercase hover:bg-blue-100 transition-all">Preset: 3 vrk / ad 25 / 0,4 ml/h</button>
            <button onClick={() => setSettings({ cassetteMl: '50', adMl: '50', speedMlH: '0.4', days: '5' })} className="p-4 bg-blue-50 text-blue-700 rounded-2xl text-xs font-black uppercase hover:bg-blue-100 transition-all">Preset: 5 vrk / ad 50 / 0,4 ml/h</button>
          </div>

          <button onClick={resetForm} className="w-full py-4 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase text-slate-400 hover:text-red-500 transition-all flex items-center justify-center gap-2"><RefreshCw size={14} /> Tyhjennä lomake</button>
        </section>

        <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-200 shadow-sm min-h-[700px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" /><span className="text-[12px] font-black text-blue-600 uppercase tracking-[0.2em]">Laskelmat</span></div>
            <button onClick={copyText} disabled={!result.isReady} className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 disabled:opacity-30 transition-all"><Copy size={14} /> {copied ? 'Kopioitu' : 'Kopioi'}</button>
          </div>

          {result.warnings.length > 0 && <div className="mb-5 space-y-2">{result.warnings.map((warning, index) => <div key={index} className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs font-bold text-amber-800 flex gap-2"><AlertTriangle size={15} className="shrink-0 mt-0.5" /><span>{warning}</span></div>)}</div>}

          {result.rows.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-200 font-black uppercase text-center"><FlaskConical size={64} className="mb-4 opacity-20" /><div className="text-4xl tracking-tighter">Syötä tiedot</div></div>
          ) : (
            <div className="flex-1 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lääkkeet yhteensä</p><div className="text-3xl font-black text-slate-800">{fmt(result.totalDrugVolume, 1)} <span className="text-sm opacity-40">ml</span></div></div>
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">NaCl lisätään</p><div className={`text-3xl font-black ${result.naclMl < 0 ? 'text-red-600' : 'text-slate-800'}`}>{fmt(result.naclMl, 1)} <span className="text-sm opacity-40">ml</span></div></div>
              </div>

              <div className="p-8 bg-blue-600 rounded-[2.5rem] text-white shadow-2xl shadow-blue-100"><p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-4">PCA-perusasetukset</p><div className="text-4xl font-black tracking-tighter">{fmt(result.adMl, 1)} ml <span className="text-lg opacity-70">ad</span></div><div className="mt-4 text-sm font-bold opacity-80">Nopeus {fmt(result.speedMlH, 1)} ml/h – {fmt(result.days, 0)} vrk – perusinfuusion tarve {fmt(result.infusionNeedMl, 1)} ml</div>{result.suggestedAdMl > 0 && result.infusionNeedMl > result.adMl && <div className="mt-3 p-3 bg-white/15 rounded-2xl text-xs font-bold">Suositeltu ad vähintään {fmt(result.suggestedAdMl, 0)} ml tällä nopeudella ja kestolla.</div>}</div>

              <div className="space-y-3">{result.rows.map((row) => <div key={row.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100"><div className="flex justify-between gap-3"><div><div className="text-base font-black text-slate-800">{row.name}</div><div className="text-[11px] font-bold text-slate-400">{fmt(row.strength, row.strength < 1 ? 3 : 1)} mg/ml</div></div><div className="text-right"><div className="text-lg font-black text-blue-600">{fmt(row.totalDose, 1)} mg</div><div className="text-[10px] font-bold text-slate-400 uppercase">{fmt(result.days, 0)} vrk</div></div></div><div className="grid grid-cols-3 gap-2 mt-3 text-[11px] font-bold text-slate-500"><div className="p-2 bg-white rounded-xl">Tilavuus<br/><span className="text-slate-900">{fmt(row.drugVolume, 1)} ml</span></div><div className="p-2 bg-white rounded-xl">Pitoisuus<br/><span className="text-slate-900">{fmt(row.concentration, row.strength < 1 ? 3 : 2)} mg/ml</span></div><div className="p-2 bg-white rounded-xl">Bolus<br/><span className="text-slate-900">{fmt(row.bolusDose, row.strength < 1 ? 3 : 2)} mg</span></div></div></div>)}</div>

              <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100"><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Boluslaskenta</p><div className="text-4xl font-black text-emerald-600">{fmt(result.bolusMl, 1)} <span className="text-xl">ml</span></div><p className="mt-2 text-xs font-bold text-emerald-700">Laskennallinen 2 × tuntiannos.</p></div>
            </div>
          )}

          <div className="mt-8 p-5 bg-blue-50 rounded-[1.5rem] border border-blue-100 flex gap-4 items-center"><div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[12px] font-black italic shadow-md shadow-blue-200">i</div><p className="text-[10px] text-blue-800 leading-tight font-bold italic">Tarkista annokset, yhteensopivuus, munuaistoiminta, sedaatioaste ja paikallinen ohjeistus ennen käyttöönottoa.</p></div>
        </section>
      </div>
    </div>
  );
}
