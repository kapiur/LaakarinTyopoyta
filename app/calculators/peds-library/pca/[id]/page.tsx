"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, RefreshCw, Save } from 'lucide-react';

type PcaDrug = {
  id: number;
  name: string;
  strength: number;
};

export default function EditPcaDrugPage({ params }: { params: { id: string } }) {
  const drugId = Number(params.id);
  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValidId = Number.isInteger(drugId) && drugId > 0;

  const loadDrug = async () => {
    if (!isValidId) {
      setError('Virheellinen lääke-ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/pca-library');
      if (!response.ok) throw new Error('PCA-lääkkeiden lataus epäonnistui');
      const drugs: PcaDrug[] = await response.json();
      const drug = drugs.find((item) => item.id === drugId);

      if (!drug) throw new Error('Lääkettä ei löytynyt');

      setName(drug.name);
      setStrength(String(drug.strength));
    } catch (err: any) {
      setError(err?.message ?? 'Lataus epäonnistui');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrug();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const saveDrug = async () => {
    const normalizedName = name.trim();
    const parsedStrength = Number(strength);

    if (!normalizedName || !Number.isFinite(parsedStrength) || parsedStrength <= 0) {
      setError('Täytä lääkkeen nimi ja positiivinen vahvuus mg/ml');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/pca-library?id=${drugId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalizedName, strength: parsedStrength }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Tallennus epäonnistui');
      }

      setMessage('PCA-lääke päivitetty');
      setTimeout(() => setMessage(null), 2200);
    } catch (err: any) {
      setError(err?.message ?? 'Tallennus epäonnistui');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[700px] mx-auto space-y-5 pb-10 text-slate-900 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link href="/calculators/peds-library" className="text-xs font-bold text-blue-600 hover:text-blue-700">
            ← Takaisin lääkekirjastoihin
          </Link>
          <h1 className="mt-2 text-2xl font-black text-slate-800">Muokkaa PCA-lääkettä</h1>
          <p className="text-sm text-slate-500 mt-1">Päivitä lääkkeen nimi ja vahvuus mg/ml.</p>
        </div>
        <button
          onClick={loadDrug}
          disabled={isLoading}
          className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Päivitä
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm font-bold text-emerald-700 flex items-center gap-2">
          <CheckCircle2 size={16} /> {message}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Lääkkeen nimi"
            className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
          />
          <input
            type="number"
            value={strength}
            onChange={(event) => setStrength(event.target.value)}
            placeholder="mg/ml"
            className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>

        <button
          onClick={saveDrug}
          disabled={isLoading}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase hover:bg-blue-700 disabled:bg-slate-200 transition-all flex items-center justify-center gap-2"
        >
          <Save size={16} /> Tallenna muutokset
        </button>
      </section>
    </div>
  );
}
