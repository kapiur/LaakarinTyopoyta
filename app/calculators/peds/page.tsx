"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Baby, Copy, RefreshCw } from 'lucide-react';

type PedsIndication = {
  id: number;
  name: string;
};

type PedsDrug = {
  id: number;
  name: string;
  form: 'LIQUID' | 'TABLET';
  unit: 'MG' | 'IU';
  strength: number;
  dosePerKgDay: number;
  timesPerDay: number;
  defaultDays: number | null;
  packageSize: number | null;
  note: string | null;
  indications: { id: number; name: string }[];
};

type PedsState = {
  mode: 'LIQUID' | 'TABLET';
  unit: 'MG' | 'IU';
  weight: string;
  dosePerKgDay: string;
  strength: string;
  timesPerDay: number;
  days: string;
  packageSize: string;
  selectedIndicationId: string;
  selectedDrugId: string;
  selectedDrugName: string;
  drugNote: string;
};

const emptyPeds: PedsState = {
  mode: 'LIQUID',
  unit: 'MG',
  weight: '',
  dosePerKgDay: '',
  strength: '',
  timesPerDay: 3,
  days: '',
  packageSize: '',
  selectedIndicationId: 'all',
  selectedDrugId: '',
  selectedDrugName: '',
  drugNote: '',
};

function fmt(value: number, digits = 1) {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(digits).replace('.', ',');
}

function deriveIndicationsFromDrugs(drugs: PedsDrug[]): PedsIndication[] {
  const map = new Map<number, PedsIndication>();

  drugs.forEach((drug) => {
    drug.indications.forEach((indication) => {
      map.set(indication.id, { id: indication.id, name: indication.name });
    });
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fi'));
}

async function fetchPedsIndications(): Promise<PedsIndication[]> {
  const response = await fetch('/api/peds/indications');
  if (!response.ok) throw new Error('Indikaatioiden lataus epäonnistui');
  const data = await response.json();
  return data.indications ?? [];
}

async function fetchPedsDrugs(indicationId = 'all'): Promise<PedsDrug[]> {
  const query = indicationId !== 'all' ? `?indicationId=${encodeURIComponent(indicationId)}` : '';
  const response = await fetch(`/api/peds/drugs${query}`);
  if (!response.ok) throw new Error('Lääkkeiden lataus epäonnistui');
  const data = await response.json();
  return data.drugs ?? [];
}

export default function PedsCalculatorPage() {
  const [peds, setPeds] = useState<PedsState>(emptyPeds);
  const [indications, setIndications] = useState<PedsIndication[]>([]);
  const [drugs, setDrugs] = useState<PedsDrug[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refreshLibrary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loadedIndications, loadedDrugs] = await Promise.all([
        fetchPedsIndications(),
        fetchPedsDrugs(peds.selectedIndicationId),
      ]);

      setDrugs(loadedDrugs);

      if (loadedIndications.length > 0) {
        setIndications(loadedIndications);
      } else {
        const allDrugs = peds.selectedIndicationId === 'all' ? loadedDrugs : await fetchPedsDrugs('all');
        setIndications(deriveIndicationsFromDrugs(allDrugs));
      }
    } catch (err: any) {
      setError(err?.message ?? 'Lataus epäonnistui');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const result = useMemo(() => {
    const weight = Number(peds.weight) || 0;
    const dosePerKgDay = Number(peds.dosePerKgDay) || 0;
    const strength = Number(peds.strength) || 0;
    const days = Number(peds.days) || 0;
    const packageSize = Number(peds.packageSize) || 0;
    const timesPerDay = peds.timesPerDay || 1;

    const dailyValue = weight * dosePerKgDay;
    const totalValue = dailyValue * days;
    const singleValue = dailyValue / timesPerDay;

    if (!weight || !dosePerKgDay || !strength) {
      return {
        isReady: false,
        dailyValue,
        totalValue,
        singleValue,
        totalAmount: 0,
        singleAmount: 0,
        packs: 0,
        actualSingleDose: 0,
        doseDiffPercent: 0,
      };
    }

    if (peds.mode === 'LIQUID') {
      const totalAmount = days > 0 ? totalValue / strength : 0;
      const singleAmount = singleValue / strength;
      const packs = packageSize > 0 ? Math.ceil(totalAmount / packageSize) : 0;

      return {
        isReady: true,
        dailyValue,
        totalValue,
        singleValue,
        totalAmount,
        singleAmount,
        packs,
        actualSingleDose: singleValue,
        doseDiffPercent: 0,
      };
    }

    const rawTabs = singleValue / strength;
    const roundedTabs = Math.round(rawTabs * 2) / 2;
    const actualSingleDose = roundedTabs * strength;
    const doseDiffPercent = singleValue > 0 ? ((actualSingleDose - singleValue) / singleValue) * 100 : 0;
    const totalTabs = days > 0 ? Math.ceil(roundedTabs * timesPerDay * days) : 0;
    const packs = packageSize > 0 ? Math.ceil(totalTabs / packageSize) : 0;

    return {
      isReady: true,
      dailyValue,
      totalValue,
      singleValue,
      totalAmount: totalTabs,
      singleAmount: roundedTabs,
      packs,
      actualSingleDose,
      doseDiffPercent,
    };
  }, [peds]);

  const handleIndicationChange = async (value: string) => {
    setPeds((prev) => ({ ...prev, selectedIndicationId: value, selectedDrugId: '', selectedDrugName: '', drugNote: '' }));
    setIsLoading(true);
    setError(null);
    try {
      const loadedDrugs = await fetchPedsDrugs(value);
      setDrugs(loadedDrugs);

      if (indications.length === 0) {
        const allDrugs = value === 'all' ? loadedDrugs : await fetchPedsDrugs('all');
        setIndications(deriveIndicationsFromDrugs(allDrugs));
      }
    } catch (err: any) {
      setError(err?.message ?? 'Lääkkeiden lataus epäonnistui');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrugChange = (value: string) => {
    const drug = drugs.find((item) => item.id === Number(value));

    if (!drug) {
      setPeds((prev) => ({ ...prev, selectedDrugId: '', selectedDrugName: '', drugNote: '' }));
      return;
    }

    setPeds((prev) => ({
      ...prev,
      selectedDrugId: String(drug.id),
      selectedDrugName: drug.name,
      mode: drug.form,
      unit: drug.unit,
      dosePerKgDay: String(drug.dosePerKgDay),
      strength: String(drug.strength),
      timesPerDay: drug.timesPerDay,
      days: drug.defaultDays ? String(drug.defaultDays) : prev.days,
      packageSize: drug.packageSize ? String(drug.packageSize) : prev.packageSize,
      drugNote: drug.note ?? '',
    }));
  };

  const resetForm = () => {
    setPeds((prev) => ({
      ...emptyPeds,
      selectedIndicationId: prev.selectedIndicationId,
    }));
  };

  const copyText = () => {
    const unit = peds.unit.toLowerCase();
    const amountUnit = peds.mode === 'LIQUID' ? 'ml' : 'tabl';
    const packageLabel = peds.mode === 'LIQUID' ? 'pulloa' : 'pakkausta';

    const text = [
      'PEDS-laskelma',
      peds.selectedDrugName ? `Lääke: ${peds.selectedDrugName}` : null,
      `Paino: ${peds.weight} kg`,
      `Annos: ${peds.dosePerKgDay} ${unit}/kg/vrk`,
      `Vuorokausiannos: ${fmt(result.dailyValue, 1)} ${unit}/vrk`,
      peds.mode === 'LIQUID'
        ? `Kerta-annos: ${fmt(result.singleAmount, 2)} ml (= ${fmt(result.singleValue, 1)} ${unit}) x ${peds.timesPerDay}/vrk`
        : `Kerta-annos: ${fmt(result.singleAmount, 1)} tabl (= noin ${fmt(result.actualSingleDose, 1)} ${unit}) x ${peds.timesPerDay}/vrk`,
      peds.days ? `Kuurin kesto: ${peds.days} vrk` : null,
      peds.days
        ? peds.mode === 'LIQUID'
          ? `Koko kuuri: ${fmt(result.totalValue, 0)} ${unit} = ${fmt(result.totalAmount, 1)} ml`
          : `Koko kuuri: ${fmt(result.totalAmount, 0)} tabl`
        : null,
      result.packs > 0 && peds.packageSize ? `Resepti: ${result.packs} ${packageLabel} à ${peds.packageSize} ${amountUnit}` : null,
      peds.drugNote ? `Huom: ${peds.drugNote}` : null,
      'Tarkista annos aina ennen kliinistä käyttöä paikallisten ohjeiden mukaisesti.',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const unit = peds.unit.toLowerCase();
  const amountUnit = peds.mode === 'LIQUID' ? 'ml' : 'tabl';

  return (
    <div className="max-w-[1200px] mx-auto space-y-5 pb-10 text-slate-900 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link href="/calculators" className="text-xs font-bold text-blue-600 hover:text-blue-700">
            ← Takaisin laskureihin
          </Link>
          <h1 className="mt-2 text-2xl font-black text-slate-800 flex items-center gap-2">
            <Baby className="text-blue-600" size={26} /> PEDS-laskuri
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Valitse indikaatio ja lääke omasta kirjastosta. Arvot täyttyvät automaattisesti, mutta niitä voi muokata käsin.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/calculators/peds-library"
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase text-blue-600 hover:bg-blue-50 transition-all"
          >
            Lääkekirjastot
          </Link>
          <button
            onClick={refreshLibrary}
            disabled={isLoading}
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Päivitä
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Indikaatio / sairaus</label>
              <select
                value={peds.selectedIndicationId}
                onChange={(event) => handleIndicationChange(event.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
              >
                <option value="all">Kaikki indikaatiot</option>
                {indications.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Lääke</label>
              <select
                value={peds.selectedDrugId}
                onChange={(event) => handleDrugChange(event.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none"
              >
                <option value="">-- Valitse lääke --</option>
                {drugs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.form === 'LIQUID' ? 'neste' : 'tabletti'} · {item.strength} {item.unit.toLowerCase()}/{item.form === 'LIQUID' ? 'ml' : 'tab'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setPeds({ ...peds, mode: 'LIQUID' })}
              className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${peds.mode === 'LIQUID' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
            >
              Neste
            </button>
            <button
              onClick={() => setPeds({ ...peds, mode: 'TABLET' })}
              className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${peds.mode === 'TABLET' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
            >
              Tabletti
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Paino (kg)</label>
              <input type="number" step="0.1" value={peds.weight} onChange={(event) => setPeds({ ...peds, weight: event.target.value })} className="w-full p-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Annos ({unit}/kg/vrk)</label>
              <input type="number" value={peds.dosePerKgDay} onChange={(event) => setPeds({ ...peds, dosePerKgDay: event.target.value })} className="w-full p-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Yksikkö</label>
              <select value={peds.unit} onChange={(event) => setPeds({ ...peds, unit: event.target.value as PedsState['unit'] })} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none">
                <option value="MG">mg</option>
                <option value="IU">IU</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Vahvuus ({unit}/{peds.mode === 'LIQUID' ? 'ml' : 'tab'})</label>
              <input type="number" value={peds.strength} onChange={(event) => setPeds({ ...peds, strength: event.target.value })} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Kesto (pv)</label>
              <input type="number" value={peds.days} onChange={(event) => setPeds({ ...peds, days: event.target.value })} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Pakkaus ({peds.mode === 'LIQUID' ? 'ml' : 'kpl'})</label>
              <input type="number" value={peds.packageSize} onChange={(event) => setPeds({ ...peds, packageSize: event.target.value })} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-blue-600 uppercase ml-1">Antokerrat / vrk</label>
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button key={n} onClick={() => setPeds({ ...peds, timesPerDay: n })} className={`py-3 rounded-xl font-black text-xs transition-all border ${peds.timesPerDay === n ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-400 border-transparent'}`}>{n}x</button>
              ))}
            </div>
          </div>

          {peds.drugNote && <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs font-bold text-amber-800">{peds.drugNote}</div>}

          <button onClick={resetForm} className="w-full py-4 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase text-slate-400 hover:text-red-500 transition-all flex items-center justify-center gap-2">
            <RefreshCw size={14} /> Tyhjennä lomake
          </button>
        </section>

        <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-200 shadow-sm min-h-[700px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-[12px] font-black text-blue-600 uppercase tracking-[0.2em]">Laskelmat</span>
            </div>
            <button onClick={copyText} disabled={!result.isReady} className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 disabled:opacity-30 transition-all">
              <Copy size={14} /> {copied ? 'Kopioitu' : 'Kopioi'}
            </button>
          </div>

          {!result.isReady ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-200 font-black uppercase text-center">
              <Baby size={64} className="mb-4 opacity-20" />
              <div className="text-4xl tracking-tighter">Syötä tiedot</div>
            </div>
          ) : (
            <div className="flex-1 space-y-5">
              <div className="p-6 bg-slate-50/80 rounded-3xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vuorokausiannos</p>
                <div className="text-4xl font-black text-slate-800">{fmt(result.dailyValue, 1)} <span className="text-sm font-bold opacity-30 tracking-normal">{unit} / vrk</span></div>
              </div>

              <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">Koko kuurin tarve</p>
                <div className="text-3xl font-bold text-slate-300">{fmt(result.totalValue, 0)} <span className="text-sm font-medium tracking-normal">{unit} yhteensä</span></div>
              </div>

              <div className="p-10 bg-blue-600 rounded-[2.5rem] text-white shadow-2xl shadow-blue-100">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-4">{peds.mode === 'LIQUID' ? 'Tarvittava tilavuus' : 'Koko kuurin määrä'}</p>
                <div className="text-7xl sm:text-8xl font-black tracking-tighter">{fmt(result.totalAmount, peds.mode === 'LIQUID' ? 1 : 0)} <span className="text-3xl font-bold tracking-tighter opacity-80">{peds.mode === 'LIQUID' ? 'ml' : 'tabl'}</span></div>
                <p className="text-[11px] font-black uppercase mt-6 tracking-widest italic opacity-80">Määrätään reseptiin koko kuurille</p>
              </div>

              <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 space-y-5">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Kerta-annos ({amountUnit})</p>
                    <div className="text-6xl font-black text-emerald-600 tracking-tighter">{fmt(result.singleAmount, peds.mode === 'LIQUID' ? 2 : 1)} <span className="text-2xl">{amountUnit}</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-emerald-500">{fmt(peds.mode === 'LIQUID' ? result.singleValue : result.actualSingleDose, 1)} {unit}</div>
                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{peds.timesPerDay} krt / vrk</div>
                  </div>
                </div>

                {peds.mode === 'TABLET' && Math.abs(result.doseDiffPercent) >= 10 && (
                  <div className="p-3 bg-amber-100/70 rounded-2xl text-[11px] font-bold text-amber-800">
                    Huom: tablettipyöristys muuttaa kerta-annosta noin {fmt(result.doseDiffPercent, 0)} %. Tarkista annos.
                  </div>
                )}
              </div>

              {result.packs > 0 && peds.packageSize && (
                <div className="p-6 bg-slate-900 rounded-3xl text-white">
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Resepti</p>
                  <div className="text-3xl font-black">{result.packs} {peds.mode === 'LIQUID' ? 'pulloa' : 'pakkausta'}</div>
                  <p className="text-[11px] opacity-40 font-medium">à {peds.packageSize} {peds.mode === 'LIQUID' ? 'ml' : 'kpl'}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 p-5 bg-blue-50 rounded-[1.5rem] border border-blue-100 flex gap-4 items-center">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[12px] font-black italic shadow-md shadow-blue-200">i</div>
            <p className="text-[10px] text-blue-800 leading-tight font-bold italic">Tarkista tulos aina ennen kliinistä käyttöä potilaan iän, painon, munuaistoiminnan, käyttöaiheen ja paikallisten ohjeiden mukaan.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
